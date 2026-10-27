import { timingSafeEqual, createHash } from 'node:crypto';
import { generate } from '../server.mjs';

export const config = { maxDuration: 120 };
function equal(a,b) {
  const hash = x => createHash('sha256').update(x).digest();
  return timingSafeEqual(hash(a),hash(b));
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if (req.method !== 'POST') return res.status(405).json({error:'Methode nicht erlaubt.'});
  const expected=process.env.STUDIO_PASSWORD;
  if (!expected || !process.env.OPENAI_API_KEY) return res.status(503).json({error:'Der Server ist noch nicht eingerichtet.'});
  const supplied=String(req.headers['x-studio-password'] || '');
  if (!supplied || !equal(supplied,expected)) return res.status(401).json({error:'Passwort nicht korrekt.'});
  try {
    const data=req.body;
    if (data?.kind === 'research') {
      if(typeof data.prompt!=='string'||!data.prompt.trim()||data.prompt.length>1000) return res.status(400).json({error:'Bitte ein Thema eingeben.'});
      const response=await fetch('https://api.openai.com/v1/responses',{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+process.env.OPENAI_API_KEY},
        body:JSON.stringify({model:process.env.OPENAI_TEXT_MODEL||'gpt-4.1-mini',tools:[{type:'web_search'}],input:'Recherchiere das folgende Thema für einen EUROMASTER Social-Media-Infopost. Unterscheide Deutschland und Österreich, wenn relevant. Erfinde keine Fakten. Gib eine kurze Überschrift, eine kurze Erklärung und Quellenlinks aus. Thema: '+data.prompt})
      });
      const out=await response.json();
      if(!response.ok) throw new Error(out.error?.message||'Recherche fehlgeschlagen.');
      const parts=(out.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==='output_text');
      const caption=parts.map(x=>x.text).join('\n').trim();
      const sources=parts.flatMap(x=>x.annotations||[]).filter(x=>x.type==='url_citation').map(x=>({title:x.title,url:x.url}));
      if(!caption) throw new Error('Keine Rechercheergebnisse erhalten.');
      return res.status(200).json({caption,sources});
    }
    const result=await generate(data);
    return res.status(200).json(result);
  } catch(e) { return res.status(400).json({error:e.message||'Anfrage fehlgeschlagen.'}); }
}
