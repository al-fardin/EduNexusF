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
