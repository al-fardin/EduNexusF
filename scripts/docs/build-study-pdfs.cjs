/* Build readable Bengali study PDFs from the reviewed Markdown and public commit snapshot.
 * Uses Chromium's Bengali shaping. Never reads .env files or earlier private repositories.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {pathToFileURL} = require('node:url');
const {createRequire} = require('node:module');
const {execFileSync} = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const runtime = process.env.EDUNEXUS_DOC_RUNTIME || path.join(os.homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies');
const req = createRequire(path.join(runtime, 'node/node_modules/playwright/package.json'));
const {chromium} = req('playwright');
const {marked} = req('marked');
const tmp = path.join(root, 'tmp/pdfs/study');
const out = path.join(root, 'output/pdf');
const sha = '88658db216433a6acb46d3cbffead422735368a6';
const base = 'https://github.com/al-fardin/EduNexusF/blob/' + sha + '/';
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

const jobs = [
  {source:'docs/guides/codebase-walkthrough-bn.md',name:'edunexus-codebase-walkthrough-bn.pdf',title:'পুরো codebase বুঝে পড়া',subtitle:'Architecture, প্রতিটি feature sector, database, Docker, Android ও desktop working pattern',type:'guide',number:'01'},
  {source:'docs/guides/security-and-judge-bn.md',name:'edunexus-security-and-judge-bn.pdf',title:'Security ও judge প্রস্তুতি',subtitle:'কী ব্যবহার হয়েছে, কোথায়, কেন, সীমাবদ্ধতা এবং ৩৫টি কঠিন প্রশ্নোত্তর',type:'guide',number:'02'},
  {source:'docs/reference/code-map-backend.md',name:'edunexus-backend-code-map-bn.pdf',title:'Backend file ও function index',subtitle:'Go API, authentication, classroom, exams, learning, messaging ও server infrastructure',type:'reference',number:'03'},
  {source:'docs/reference/code-map-frontend.md',name:'edunexus-frontend-code-map-bn.pdf',title:'Frontend file ও function index',subtitle:'Next.js routes, React components, services, providers, state ও browser algorithms',type:'reference',number:'04'},
  {source:'docs/reference/code-map-data-runtime.md',name:'edunexus-database-docker-clients-code-map-bn.pdf',title:'Database, Docker ও clients index',subtitle:'SQL migrations, queries, deployment, scripts, Android, desktop ও extension',type:'reference',number:'05'},
  {source:null,name:'edunexus-commit-history-large-bn.pdf',title:'সব commit-এর বাংলা ব্যাখ্যা',subtitle:'শুধু EduNexusF-এর ৯৪টি commit - প্রথম সংরক্ষিত snapshot থেকে 78ca06f পর্যন্ত',type:'history',number:'06'},
];
const mapped = Object.fromEntries(jobs.filter(j=>j.source).map(j=>[path.resolve(root,j.source).toLowerCase(),j.name]));

// Equivalent visual forms of the two conceptual Mermaid diagrams in the Markdown.
function architecture() {
  const box=(x,y,w,label)=>`<rect x="${x}" y="${y}" width="${w}" height="46" rx="8" fill="#f5eee6" stroke="#b59b83"/><text x="${x+w/2}" y="${y+28}" text-anchor="middle">${label}</text>`;
  return `<figure><svg viewBox="0 0 680 660" role="img" aria-label="Application architecture">
  <defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#927255"/></marker></defs>
  <g fill="none" stroke="#927255" stroke-width="2" marker-end="url(#arrow)">
  <path d="M340 56V108M340 154V222M340 268V340"/>
  <path d="M340 285V310H80V340M340 285V310H605V340"/>
  <path d="M210 245H180V467H150M470 245H500V467H470M500 467H540"/>
  <path d="M570 154V185H480V245H470M200 131H205V245H210"/>
  <path d="M175 33H4V571H175" stroke-dasharray="6 4"/></g>
  <g font-family="Segoe UI, sans-serif" font-size="17" fill="#433529">
  ${box(175,10,330,'Web browser / Android WebView')}${box(215,108,250,'HTTPS Caddy gateway')}
  ${box(210,222,260,'Go Fiber modular API')}${box(10,108,190,'Next.js pages / assets')}${box(485,108,190,'Python desktop client')}
  ${box(220,340,240,'PostgreSQL')}${box(10,340,140,'Private files')}${box(540,340,130,'Notifications')}
  ${box(210,444,260,'Optional coding containers')}${box(10,444,140,'OpenAI API')}${box(540,444,130,'SMTP / push')}
  ${box(175,548,330,'WebRTC media: peer or TURN relay')}
  <text x="340" y="91" text-anchor="middle" font-size="14">HTTPS JSON / WebSocket events</text>
  <text x="340" y="651" text-anchor="middle" font-size="14">Media path আলাদা; API সাধারণত media relay নয়।</text></g></svg>
  <figcaption>ধারণাগত architecture। Local development-এ Next API proxy ব্যবহৃত হয়; production gateway আলাদা।</figcaption></figure>`;
}
function dataDiagram() {
  const items=[['Users','Account, sessions ও security'],['Memberships','Classroom role, section ও roll'],['Coursework','Materials, assignments ও exams'],['Student work','Attempts, submissions ও grades'],['Communication','Messages, call state ও notifications'],['Personal workspace','User-private notes ও files']];
  return '<figure><div class="data-flow">'+items.map(([a,b])=>`<div><b>${a}</b><span>${b}</span></div>`).join('')+'</div><figcaption>Conceptual relationships; exact table ও foreign keys migrations-এ দেখুন। প্রতিটি box একটি আলাদা physical table নয়।</figcaption></figure>';
}

function historyMarkdown() {
  const python = path.join(runtime,'python/python.exe');
  const code = `import importlib.util,json\nspec=importlib.util.spec_from_file_location('history',r'${path.join(root,'scripts/docs/build-commit-history.py')}')\nm=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)\nprint(json.dumps(m.collect('78ca06f'),ensure_ascii=False))`;
  const rows = JSON.parse(execFileSync(python,['-X','utf8','-c',code],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024}));
  const definitions = Object.fromEntries(fs.readFileSync(path.join(root,'scripts/docs/commit-explanations-bn.txt'),'utf8').trim().split(/\r?\n/).map(line=>{const [hash,...rest]=line.split('|');return [hash,rest]}));
  if(rows.length!==94)throw Error('Unexpected commit scope');
  let s='# EduNexusF: ৯৪টি commit-এর ব্যাখ্যা\n\nশুধু এই repository-এর history, snapshot **78ca06f** পর্যন্ত। অন্য repositories-এর তথ্য নেই।\n\n## Coverage ও পড়ার নিয়ম\n\nপ্রতিটি entry-তে hash, Git committer date, কী বদলেছে, তার অর্থ, নির্বাচিত paths ও সম্পূর্ণ diff link আছে। Root commit হলো প্রথম সংরক্ষিত snapshot; সব code ওই দিন প্রথম লেখা হয়েছে এমন প্রমাণ নয়। Test পরিবর্তিত হওয়া মানে test pass-এর প্রমাণ নয়। পুরোনো theme/logo পরে বদলেছে; পরের fix-ও পড়ুন।\n\nText-line সংখ্যা Git numstat-এর churn; quality score বা নিজের লেখা code-এর মাপ নয়। PDF তৈরির পরবর্তী commit এই frozen scope-এর বাইরে।\n\n';
  rows.forEach((r,i)=>{
    const [title,change,meaning]=definitions[r.short];
    const selected=r.changes.filter(c=>!c.path.endsWith('.sum')).slice(0,3);
    s+=`## ${String(i+1).padStart(2,'0')}. ${title}\n\n**Commit:** \`${r.short}\` | **তারিখ:** ${r.date}\n\n*${r.subject}*\n\n**কী বদলেছে:** ${change}\n\n**কাজের অর্থ:** ${meaning}\n\n**প্রধান paths:**\n\n${selected.map(c=>'- `'+c.path+'`').join('\n')}\n\n**Scope:** ${r.changes.length} changed-file entries; +${r.changes.reduce((n,c)=>n+(c.added||0),0)} / -${r.changes.reduce((n,c)=>n+(c.deleted||0),0)} text lines।\n\n[সম্পূর্ণ GitHub diff](https://github.com/al-fardin/EduNexusF/commit/${r.sha})\n\n`;
  });
  return s;
}

const css=`
@page{size:A4;margin:18mm 17mm 20mm}*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;color:#29241f;font:15pt/1.7 "Nirmala UI","Segoe UI",sans-serif;overflow-wrap:anywhere}
p{margin:0 0 5mm;orphans:3;widows:3}h1,h2,h3{line-height:1.4;break-after:avoid;page-break-after:avoid}h1{font-size:27pt;margin:0 0 10mm}h2{font-size:22pt;margin:10mm 0 5mm;color:#794e30}h3{font-size:18pt;margin:8mm 0 4mm;color:#4c3828}
li{margin:0 0 3mm}ul,ol{padding-left:8mm;margin:0 0 6mm}a{color:#8a542f;text-decoration:none;overflow-wrap:anywhere}
strong{font-weight:700}code{font:12pt/1.6 Consolas,"Nirmala UI",monospace;overflow-wrap:anywhere;color:#694830;background:#f6f0e9;padding:0 .7mm;border-radius:1mm}
pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5efe8;border-left:3px solid #b48c68;padding:5mm;margin:5mm 0;break-inside:avoid}pre code{background:none;padding:0;font-size:12pt}
blockquote{margin:6mm 0;padding:4mm 6mm;border-left:3px solid #aa815f;background:#f7f2ec}blockquote p:last-child{margin-bottom:0}
table{width:100%;border-collapse:collapse;table-layout:fixed;margin:6mm 0;font-size:13pt;line-height:1.55}th,td{padding:3.5mm;vertical-align:top;border:1px solid #ddcdbc;overflow-wrap:anywhere}th{background:#f2e7dc;color:#6c4429;text-align:left}thead{display:table-header-group}tr{break-inside:avoid}td code{font-size:11.5pt}
.cover{height:252mm;break-after:page;padding-top:8mm;position:relative;background:linear-gradient(135deg,#fff 40%,#faf4ed)}
.brand{display:flex;align-items:center;gap:5mm;margin-bottom:34mm;font:700 11pt "Segoe UI";letter-spacing:1.5px;color:#865b3c}.brand img{width:22mm;height:22mm;object-fit:contain}
.cover-label{color:#8e674a;font-size:14pt;margin-bottom:6mm}.cover h1{font-size:37pt;line-height:1.45;margin-bottom:10mm}.cover-sub{font-size:19pt;line-height:1.75;color:#66574a}
.cover-meta{position:absolute;bottom:12mm;border-top:1px solid #ccb7a1;padding-top:7mm;width:100%;font-size:13pt}.cover-meta p{margin-bottom:3mm}
.reader{break-after:page}.reader h1{font-size:25pt}.reader p{font-size:15pt}.hint{background:#f6eee5;border-left:3px solid #aa805b;padding:5mm;margin:6mm 0}
.toc{break-after:page}.toc h1{font-size:26pt}.toc ol{padding-left:10mm}.toc li{font-size:14pt;line-height:1.6;margin:0 0 3.5mm}
.history .content>h2{break-before:page}
.content>h1{font-size:25pt;padding-bottom:5mm;border-bottom:2px solid #9b7252}
.reference h2{font:700 20pt/1.4 Consolas,"Nirmala UI",monospace;border-top:2px solid #ad8969;padding-top:5mm}.reference h3{font:700 16pt/1.5 Consolas,"Nirmala UI",monospace}
.reference .content>p{font-size:14pt}.reference .symbols{padding:2mm 0 5mm 5mm;border-left:2px solid #dfcbb7;margin:0 0 6mm;list-style:none}
.reference .symbols li{font-size:14pt;margin:0 0 2.5mm}.reference .symbols code{font-size:13pt}.reference h3 a{color:#69462e}.vendor li{font-size:13pt}
figure{margin:7mm 0;break-inside:avoid}figure svg{width:100%;height:auto}figcaption{font-size:12pt;color:#786757;line-height:1.65;margin-top:4mm}
.data-flow{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.data-flow div{padding:5mm;background:#f5eee6;border:1px solid #c8ad92;border-radius:2mm}.data-flow b{display:block;font-size:15pt}.data-flow span{display:block;font-size:13pt;margin-top:2mm}
.history .content>h2{font-size:23pt}.history .toc li{font-size:13.5pt}
`;

(async()=>{
  fs.mkdirSync(tmp,{recursive:true});fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const results=[];
  try{
    for(const job of jobs){
      let md=job.source?fs.readFileSync(path.join(root,job.source),'utf8'):historyMarkdown();
      // Lists keep each symbol clickable and legible instead of a very long inline line.
      if(job.type==='reference') md=md.split(/\r?\n/).map(line=>/^\[`.+?` L\d+\]\(/.test(line)?line.split(' · ').map(x=>'- '+x).join('\n'):line).join('\n');
      let diagram=0;
      let content=marked.parse(md,{gfm:true});
      content=content.replace(/<pre><code class="language-mermaid">[\s\S]*?<\/code><\/pre>/g,()=>++diagram===1?architecture():dataDiagram());
      const snapshot=job.type==='history'?'78ca06f':'88658db';
      const reader=job.type==='reference'?`<p>এই PDF file/function খোঁজার reference। আগে 01 walkthrough ও 02 security guide পড়লে index-এর code roles বুঝতে সহজ হবে।</p><p>প্রতিটি file heading source খুলবে। নিচের function/type ও L-number link সেই snapshot-এর exact code line খুলবে। বড় monospace text-এ long path একাধিক লাইনে ভাঙতে পারে।</p><div class="hint">এটি semantic line-by-line annotation বা compiler call graph নয়। Generated, Test ও Vendored labels আলাদা করে পড়ুন। Source খুলতে internet দরকার; এই PDF-এর লেখা offline পড়া যাবে।</div>`:`<p>১৫-point বাংলা body text, বড় headings এবং আলাদা spacing দিয়ে পড়ার সংস্করণ তৈরি হয়েছে। মূল source-এর বিষয়বস্তু বাদ দেওয়া হয়নি।</p><p>সূচির heading-এ click করে section-এ যান। Code links দেখতে internet দরকার; PDF-এর লেখা offline পড়া যাবে।</p><div class="hint">এটি শেখার material। Security control থাকা ও production-এ সেটি configured/verified হওয়া এক কথা নয়। Source snapshot ও test scope খেয়াল করুন।</div>`;
      const html=`<!doctype html><html lang="bn"><head><meta charset="utf-8"><title>EduNexus ${esc(job.title)}</title><style>${css}</style></head><body class="${job.type}"><section class="cover"><div class="brand"><img src="${pathToFileURL(path.join(root,'docs/branding/edunexus-titanium-master.png')).href}"><span>EDUNEXUS / STUDY LIBRARY</span></div><p class="cover-label">বই ${job.number} / বড় অক্ষরে পড়ার সংস্করণ</p><h1>${esc(job.title)}</h1><p class="cover-sub">${esc(job.subtitle)}</p><div class="cover-meta"><p><b>Source snapshot:</b> ${snapshot} / 27 November 2026</p><p>বাংলায় explanation ও clickable source references</p><p>শুধু EduNexusF repository; অন্য repo-এর তথ্য নেই।</p></div></section><section class="reader"><h1>যেভাবে পড়বেন</h1>${reader}</section><nav class="toc"><h1>সূচি</h1><ol></ol></nav><main class="content">${content}</main></body></html>`;
      const htmlPath=path.join(tmp,job.name.replace('.pdf','.html'));fs.writeFileSync(htmlPath,html);
      const page=await browser.newPage();
      await page.route('**/*',route=>/^(file:|data:)/.test(route.request().url())?route.continue():route.abort());
      await page.goto(pathToFileURL(htmlPath).href,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
      await page.evaluate(({source,mapped,root,base})=>{
        document.querySelectorAll('main h2').forEach((heading,i)=>{heading.id='section-'+i;const li=document.createElement('li');const a=document.createElement('a');a.href='#'+heading.id;a.textContent=heading.textContent;li.append(a);document.querySelector('.toc ol').append(li)});
        document.querySelectorAll('main a').forEach(a=>{
          const href=a.getAttribute('href');if(!href||/^(https?:|#|mailto:)/.test(href))return;
          const origin=source?new URL(source,'file:///'+root.replaceAll('\\','/')+'/'):new URL('file:///'+root.replaceAll('\\','/')+'/docs/README.md');
          const resolved=new URL(href,origin);let file=decodeURIComponent(resolved.pathname).replace(/^\/(\w:)/,'$1');
          const key=file.replaceAll('/','\\').toLowerCase();
          if(mapped[key])a.setAttribute('href',mapped[key]);
          else {const relative=file.replaceAll('\\','/').slice(root.replaceAll('\\','/').length+1);a.href=base+relative.split('/').map(encodeURIComponent).join('/')+resolved.hash;}
        });
        document.querySelectorAll('main ul').forEach(ul=>{if([...ul.children].every(li=>li.querySelector('a code')))ul.classList.add('symbols')});
      },{source:job.source,mapped,root,base});
      const overflow=await page.evaluate(()=>[...document.querySelectorAll('main,table,pre,figure,.cover,.reader')].filter(e=>e.scrollWidth>e.clientWidth+3).map(e=>({tag:e.tagName,width:e.clientWidth,scroll:e.scrollWidth})));
      if(overflow.length)throw Error(job.name+' horizontal overflow '+JSON.stringify(overflow));
      await page.pdf({path:path.join(out,job.name),format:'A4',preferCSSPageSize:true,printBackground:true,outline:true,tagged:true,displayHeaderFooter:true,headerTemplate:'<div></div>',footerTemplate:`<div style="font:9px Arial;color:#8b7665;width:100%;padding:0 17mm;display:flex;justify-content:space-between"><span>EDUNEXUS / ${job.number} / ${snapshot}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`});
      results.push({file:job.name,source:job.source,bytes:fs.statSync(path.join(out,job.name)).size,headings:await page.locator('main h2').count(),links:await page.locator('main a').count(),diagrams:diagram});
      console.log(JSON.stringify(results.at(-1)));await page.close();
    }
  }finally{await browser.close()}
  // Chromium resolves sibling-document links against the temporary HTML location.
  // Keep them relative so the PDFs also work after downloading/extracting together.
  const finalize=`from pathlib import Path
import os,sys
from pypdf import PdfReader,PdfWriter
from pypdf.generic import NameObject,TextStringObject
names={Path(p).name for p in sys.argv[1:]}
for value in sys.argv[1:]:
 p=Path(value); reader=PdfReader(p); writer=PdfWriter(); writer.clone_document_from_reader(reader)
 for page in writer.pages:
  for ref in page.get('/Annots',[]):
   action=ref.get_object().get('/A',{}); uri=str(action.get('/URI',''))
   if uri.startswith('file:') and uri.rsplit('/',1)[-1] in names:
    action[NameObject('/URI')]=TextStringObject(uri.rsplit('/',1)[-1])
 writer.add_metadata({'/Author':'EduNexus','/Subject':'Bengali large-print study library; public EduNexusF snapshots only'})
 target=p.with_suffix('.normalized.pdf')
 with target.open('wb') as stream: writer.write(stream)
 os.replace(target,p)
 print(p.name,len(reader.pages),'pages')
`;
  console.log(execFileSync(path.join(runtime,'python/python.exe'),['-X','utf8','-c',finalize,...jobs.map(j=>path.join(out,j.name))],{encoding:'utf8'}));
  fs.writeFileSync(path.join(tmp,'build-results.json'),JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
