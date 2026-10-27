import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY = 26 * 1024 * 1024;
const channels = {instagram:'Instagram', facebook:'Facebook', linkedin:'LinkedIn'};
const instructions = `Du bist Social-Media-Redakteur für EUROMASTER Deutschland und Österreich. Schreibe auf Deutsch, authentisch, freundlich und konkret. Erfinde keine Angebote, Preise, Standorte oder Leistungen. Instagram und Facebook: Du-Ansprache. LinkedIn: Sie-Ansprache. Keine Anführungszeichen um den Text. Gib ausschließlich den fertigen Beitrag inklusive weniger passender Hashtags aus.`;
export function imageSize(width, height) { return width / height > 1.15 ? '1536x1024' : height / width > 1.15 ? '1024x1536' : '1024x1024'; }
export function validate(data) {
  if (!data || typeof data.prompt !== 'string' || !data.prompt.trim() || data.prompt.length > 5000) throw new Error('Bitte ein Briefing mit höchstens 5.000 Zeichen eingeben.');
  if (!channels[data.channel]) throw new Error('Bitte einen Kanal auswählen.');
  for (const n of [data.width, data.height]) if (!Number.isInteger(n) || n < 256 || n > 3000) throw new Error('Breite und Höhe müssen zwischen 256 und 3000 Pixel liegen.');
  if (!Array.isArray(data.references) || data.references.length > 3) throw new Error('Bitte höchstens drei Referenzbilder auswählen.');
  for (const ref of data.references) if (typeof ref !== 'string' || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(ref) || ref.length > 8_388_640) throw new Error('Referenzen müssen JPEG, PNG oder WebP und kleiner als 6 MB sein.');
  if (!['image','caption'].includes(data.kind)) throw new Error('Ungültige Aktion.');
}
async function body(req) { let size=0, parts=[]; for await (const chunk of req) { size+=chunk.length; if(size>MAX_BODY) throw new Error('Die Anfrage ist zu groß.'); parts.push(chunk); } return JSON.parse(Buffer.concat(parts).toString('utf8')); }
async function openai(endpoint, options) {
  const key=process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY fehlt. Bitte den Schlüssel auf dem Server als Umgebungsvariable hinterlegen.');
  const response=await fetch(`https://api.openai.com/v1/${endpoint}`,{...options,headers:{...options.headers,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(180000)});
  const result=await response.json();
  if (!response.ok) throw new Error(`KI-Anfrage fehlgeschlagen (${response.status}): ${result.error?.message || 'Bitte später erneut versuchen.'}`);
  return result;
}
async function generate(data) {
  validate(data);
  if(data.kind==='caption') {
    const out=await openai('responses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_TEXT_MODEL || 'gpt-4.1-mini',instructions,input:`Kanal: ${channels[data.channel]}\nBriefing: ${data.prompt}`})});
    const caption=(out.output || []).flatMap(x=>x.content || []).filter(x=>x.type==='output_text').map(x=>x.text).join('\n').trim();
    if (!caption) throw new Error('Es wurde kein Beitragstext zurückgegeben.');
    return {caption};
  }
  const prompt=`Erstelle ein authentisches, hochwertiges Social-Media-Foto für EUROMASTER. Dokumentarischer, natürlicher Werkstatt-Look, realistische Fahrzeuge und Reifen, echte Arbeitssituationen. Falls Referenzbilder beigefügt sind, nutze sie als Orientierung für Arbeitskleidung und Umgebung. Keine erfundenen Schriftzüge, Logos oder lesbaren Namensschilder. Motiv: ${data.prompt}`;
  const size=imageSize(data.width,data.height); let result;
  if(data.references.length) {
    const form=new FormData(); form.set('model',process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare'); form.set('prompt',prompt); form.set('size',size);
    data.references.forEach((ref,i)=>{const [,mime,b64]=ref.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);form.append('image[]',new Blob([Buffer.from(b64,'base64')],{type:mime}),`reference-${i}.${mime==='image/jpeg'?'jpg':mime.split('/')[1]}`);});
    result=await openai('images/edits',{method:'POST',body:form});
  } else result=await openai('images/generations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-flare',prompt,size})});
  if (!result.data?.[0]?.b64_json) throw new Error('Es wurde kein Bild zurückgegeben.');
  return {image:`data:image/png;base64,${result.data[0].b64_json}`};
}
export function makeServer(){return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Cache-Control','no-store');
  try {
    if(req.method==='GET' && (req.url==='/' || req.url==='/index.html')) {res.setHeader('Content-Type','text/html; charset=utf-8'); return res.end(await readFile(path.join(root,'public/index.html')));}
    if(req.method==='GET' && req.url==='/health') {res.setHeader('Content-Type','application/json'); return res.end(JSON.stringify({ok:true,configured:!!process.env.OPENAI_API_KEY}));}
    if(req.method==='POST' && req.url==='/api/generate') {
      const origin=req.headers.origin;
      if (origin && origin!==`http://localhost:${PORT}` && origin!==`http://127.0.0.1:${PORT}`) {res.statusCode=403;return res.end('Forbidden');}
      const data=await body(req), result=await generate(data);res.setHeader('Content-Type','application/json');return res.end(JSON.stringify(result));
    }
    res.statusCode=404; res.end('Not found');
  } catch(e) { res.statusCode=400;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:e.message || 'Ein Fehler ist aufgetreten.'})); }
});}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) makeServer().listen(PORT,'127.0.0.1',()=>console.log(`Content Studio: http://localhost:${PORT}`));
