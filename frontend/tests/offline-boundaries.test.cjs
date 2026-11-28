const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),ts=require("typescript");
test("only material downloads can read cached file blobs; exam and submission APIs stay online",async()=>{
 let reads=0;const exports={};
 const source=ts.transpileModule(fs.readFileSync("lib/offline-resources.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const failure={response:{status:503}};const blob=new Blob(["cached notes"]);
 vm.runInNewContext(source,{exports,DOMException,require:name=>name==="./api"?{api:{get:async()=>{throw failure;}}}:name.includes("auth-store")?{useAuthStore:{getState:()=>({user:{id:"owner"}})}}:{readOffline:async()=>{reads++;return {value:blob};},cacheOffline:async()=>{},offlineKey:()=>"record",purgeOffline:async()=>{},removeOffline:async()=>{}}});
 const id="12345678-1234-4234-8234-123456789abc";
 assert.equal(await exports.materialBlob(`/classrooms/${id}/materials/${id}/download`),blob);
 assert.equal(reads,1);
 for(const path of [`/classrooms/${id}/exams/${id}/workspace`,`/classrooms/${id}/assignments/${id}/submissions/${id}/file`,"/auth/me"]){await assert.rejects(exports.materialBlob(path),e=>e===failure);}
 assert.equal(reads,1);
 failure.response.status=403;await assert.rejects(exports.materialBlob(`/classrooms/${id}/materials/${id}/download`));assert.equal(reads,1);
});
test("service worker handles navigation once and never caches API responses",async()=>{
 const listeners={},cached=[];
 const cache={match:async()=>null,put:async request=>cached.push(request),keys:async()=>[]};
 const source=fs.readFileSync("public/edunexus-sw.js","utf8");
 vm.runInNewContext(source,{self:{location:{origin:"https://edunexus.invalid"},addEventListener:(kind,listener)=>(listeners[kind]??=[]).push(listener)},caches:{open:async()=>cache,match:async()=>null},URL,Response,fetch:async()=>new Response("asset")});
 assert.equal(listeners.fetch.length,1);
 let handled=0;
 for(const path of ["/api/auth/me","/api/classrooms/class/exams","/api/classrooms/class/materials"]){listeners.fetch[0]({request:{url:"https://edunexus.invalid"+path,method:"GET",mode:"cors"},respondWith:()=>handled++});}
 assert.equal(handled,0);assert.equal(cached.length,0);
 const pending=[];listeners.fetch[0]({request:{url:"https://edunexus.invalid/_next/static/chunk.js",method:"GET",mode:"cors"},respondWith:value=>{pending.push(value);handled++;}});await Promise.all(pending);
 assert.equal(handled,1);assert.equal(cached.length,1);
});
test("stale JavaScript cannot replace an online chunk; offline cached assets still work",async()=>{
 const listeners={},cache={match:async()=>new Response('stale chunk'),put:async()=>{},keys:async()=>[]};let online=true;
 vm.runInNewContext(fs.readFileSync('public/edunexus-sw.js','utf8'),{self:{location:{origin:'https://edunexus.invalid'},addEventListener:(name,fn)=>listeners[name]=fn},caches:{open:async()=>cache},URL,Response,fetch:async()=>{if(!online)throw Error('offline');return new Response('fresh chunk')}});
 const request={url:'https://edunexus.invalid/_next/static/chunks/app/login/page.js',method:'GET',mode:'cors'};let response;
 listeners.fetch({request,respondWith:p=>response=p});assert.equal(await (await response).text(),'fresh chunk');
 online=false;listeners.fetch({request,respondWith:p=>response=p});assert.equal(await (await response).text(),'stale chunk');
});
test("worker activation removes obsolete build caches without removing unrelated storage",async()=>{
 const listeners={},removed=[];
 vm.runInNewContext(fs.readFileSync('public/edunexus-sw.js','utf8'),{self:{addEventListener:(name,fn)=>listeners[name]=fn,clients:{claim:async()=>{}}},caches:{keys:async()=>['edunexus-offline-assets-v1','edunexus-offline-shell-v1','edunexus-offline-assets-v2','other-app-cache'],delete:async name=>removed.push(name)}});
 let pending;listeners.activate({waitUntil:p=>pending=p});await pending;assert.deepEqual(removed,['edunexus-offline-assets-v1','edunexus-offline-shell-v1']);
});
test("independent recovery updates a stale worker and reloads at most once",async()=>{
 let changed,reloads=0,replaced='',updates=0,options;const values=new Map();
 vm.runInNewContext(fs.readFileSync('public/edunexus-recovery.js','utf8'),{location:{pathname:'/login',href:'https://edunexus.invalid/login?password=fixture-only&code=123&next=%2Ftasks',reload:()=>reloads++},history:{state:null,replaceState:(_,__,url)=>replaced=url},URL,window:{isSecureContext:true},sessionStorage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},navigator:{serviceWorker:{controller:{},addEventListener:(_,fn)=>changed=fn,register:async(_,o)=>{options=o;return{update:async()=>updates++}}}}});
 await new Promise(r=>setImmediate(r));assert.equal(options.updateViaCache,'none');assert.equal(updates,1);assert.equal(replaced,'/login?next=%2Ftasks');changed();changed();assert.equal(reloads,1);
});
