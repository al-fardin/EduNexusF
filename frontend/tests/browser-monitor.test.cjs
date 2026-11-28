const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const {webcrypto}=require('node:crypto');const ts=require('typescript');
const extension=path.resolve(__dirname,'../../chrome-extension');

test('site connection requests only the selected host and records its exact origin',async()=>{
 const fields=new Map();const calls=[];const stored={};
 const document={querySelector:s=>{if(!fields.has(s))fields.set(s,{});return fields.get(s)}};
 const chrome={runtime:{sendMessage:async()=>({ok:true})},tabs:{query:async()=>[{id:7,url:'http://192.168.1.40:3007/classrooms/demo'}]},permissions:{request:async value=>{calls.push(['permission',value]);return true}},storage:{local:{get:async()=>({...stored}),set:async value=>Object.assign(stored,value)}},scripting:{unregisterContentScripts:async()=>{},registerContentScripts:async value=>calls.push(['register',value]),executeScript:async value=>calls.push(['inject',value])}};
 vm.runInNewContext(fs.readFileSync(path.join(extension,'popup.js'),'utf8'),{document,chrome,crypto:webcrypto,TextEncoder,URL,confirm:()=>true});
 await fields.get('#connect-site').onclick();
 assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])),{origins:['http://192.168.1.40/*']});
 assert.deepEqual([...stored.edunexus_allowed_origins],['http://192.168.1.40:3007']);
 assert.equal(calls.find(c=>c[0]==='register')[1][0].persistAcrossSessions,true);
 assert.equal(calls.find(c=>c[0]==='inject')[1].target.tabId,7);
});

test('an unapproved port or host does not install the extension bridge',async()=>{
 const source=fs.readFileSync(path.join(extension,'content.js'),'utf8');
 for(const site of ['http://192.168.1.40:3007','http://192.168.1.40:3008','https://other.example']){
  let listeners=0;const location=new URL(site);const window={addEventListener:()=>listeners++,postMessage:()=>{}};
  await vm.runInNewContext(source,{window,location,document:{addEventListener:()=>{}},chrome:{storage:{local:{get:async()=>({edunexus_allowed_origins:['http://192.168.1.40:3007']})}}}});
  assert.equal(listeners,site.endsWith('3007')?1:0,site);
 }
});

test('monitor bridge rejects foreign-origin replies and cleans request listeners',async()=>{
 const listeners=new Set();const exports={};
 const window={location:{origin:'http://127.0.0.1:3007'},crypto:webcrypto,setTimeout,clearTimeout,addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn),postMessage:message=>{
  if(message.source!=='EDUNEXUS_MONITOR_WEB_V1')return;
  const reply={source:'EDUNEXUS_MONITOR_EXT_V1',requestId:message.requestId,type:message.type,response:{ok:true,version:'1.4.0'}};
  for(const fn of [...listeners])fn({source:window,origin:'https://other.example',data:reply});
  assert.equal(listeners.size,1);
  for(const fn of [...listeners])fn({source:window,origin:window.location.origin,data:reply});
 }};
 const source=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../lib/exam-monitor-bridge.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 vm.runInNewContext(source,{exports,window,Uint8Array});
 assert.equal((await exports.monitorBridge('STATUS')).ok,true);
 assert.equal(listeners.size,0);
});
