const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function harness({initial,recognize}={}){
 const state={created:0,terminated:0};const worker={recognize:recognize??(async()=>({data:{text:'Choose one\nA. Yes\nB. No\nANSWER: A',confidence:96}})),terminate:async()=>{state.terminated++}};
 const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/question-ocr.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,DOMException,Promise,require:()=>({createWorker:()=>{state.created++;return initial??Promise.resolve(worker)}}),createImageBitmap:async()=>({width:300,height:200,close(){}}),document:{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},drawImage(){}})})}});
 return {...state,state,worker,read:exports.recognizeQuestionScan};
}
const file={size:200,name:'scan.png',type:'image/png'};
const options=signal=>({language:'eng',startPage:1,endPage:1,signal,onProgress(){}});
test('scan extraction returns reviewable text and always terminates its worker',async()=>{
 const h=harness(),controller=new AbortController(),result=await h.read(file,options(controller.signal));assert.match(result.text,/ANSWER: A/);assert.equal(result.confidence,96);assert.equal(h.state.terminated,1);
});
test('cancelling recognition releases the worker even if its job never resolves',async()=>{
 let started;const pending=new Promise(resolve=>started=resolve);const h=harness({recognize:()=>{started();return new Promise(()=>{})}}),controller=new AbortController();const run=h.read(file,options(controller.signal));await pending;controller.abort();await assert.rejects(run,e=>e.name==='AbortError');assert.equal(h.state.terminated,1);
});
test('cancelling initialization ignores and terminates the late worker',async()=>{
 let resolve;const initial=new Promise(done=>resolve=done),h=harness({initial}),controller=new AbortController();const run=h.read(file,options(controller.signal));await new Promise(done=>setImmediate(done));controller.abort();await assert.rejects(run,e=>e.name==='AbortError');resolve(h.worker);await new Promise(done=>setImmediate(done));assert.equal(h.state.terminated,1);
});
test('file size, type and page limits are checked before starting OCR',async()=>{
 const h=harness(),controller=new AbortController();for(const [input,opts] of [[{...file,size:11*1024*1024},{}],[{...file,type:'image/svg+xml'},{}],[file,{endPage:6}]])await assert.rejects(h.read(input,{...options(controller.signal),...opts}));assert.equal(h.state.created,0);
});
