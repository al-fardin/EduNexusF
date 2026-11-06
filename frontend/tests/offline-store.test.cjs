const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),ts=require("typescript");
const {randomUUID}=require("node:crypto");
const {IDBFactory}=require("fake-indexeddb");
function setup(){
 let owner="student-a";
 const exports={};const source=ts.transpileModule(fs.readFileSync("lib/offline-store.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{exports,indexedDB:new IDBFactory(),Date,Event,Error,Blob,require:name=>name.includes("auth-store")?{useAuthStore:{getState:()=>({user:{id:owner}})}}:{clientId:randomUUID}});
 return {store:exports,account:value=>{owner=value;}};
}
const draft=(extra={})=>({answer:"Saved answer",file:null,fileName:"",expectedVersion:0,requestId:randomUUID(),queued:false,...extra});
test("offline records are account scoped and logout cleanup removes blobs and drafts",async()=>{
 const {store:s,account}=setup();const a=await s.saveAssignmentDraft("student-a","class","assignment","Work",draft({file:new Blob(["source"]),fileName:"code.txt"}),null);
 assert.equal((await s.readOffline("student-a",a.id)).value.file.size,6);
 account("student-b");await assert.rejects(s.readOffline("student-a",a.id),/Account changed/);
 assert.equal(await s.readOffline("student-b",a.id),null);
 await s.purgeOffline("student-a");account("student-a");assert.equal((await s.listOffline("student-a")).length,0);
});
test("draft CAS rejects stale tab writes and only one uploader can claim a submission",async()=>{
 const {store:s}=setup();const original=await s.saveAssignmentDraft("student-a","class","assignment","Work",draft(),null);
 await assert.rejects(s.saveAssignmentDraft("student-a","class","assignment","Work",draft(),null),/Another tab/);
 const queued=await s.saveAssignmentDraft("student-a","class","assignment","Work",draft({queued:true}),original.value.revision);
 const claims=await Promise.all([s.claimAssignmentDraft("student-a"),s.claimAssignmentDraft("student-a")]);
 assert.equal(claims.filter(Boolean).length,1);const claimed=claims.find(Boolean);assert.equal(claimed.value.revision,queued.value.revision);
 assert.equal(await s.renewAssignmentLease(claimed),true);
 await assert.rejects(s.saveAssignmentDraft("student-a","class","assignment","Work",draft({answer:"Changed"}),claimed.value.revision),/queued/);
 const released=await s.finishAssignmentDraft(claimed,{message:"Review needed",blocked:true});assert.equal(released,true);
 const edited=await s.saveAssignmentDraft("student-a","class","assignment","Work",draft({answer:"Changed"}),claimed.value.revision);
 assert.equal(await s.finishAssignmentDraft(claimed),false);assert.equal(await s.renewAssignmentLease(claimed),false);
 assert.equal((await s.readOffline("student-a",edited.id)).value.answer,"Changed");
});
test("uncertain versions cannot queue; failed network retries retain work and permanent errors block",async()=>{
 const {store:s}=setup();await assert.rejects(s.saveAssignmentDraft("student-a","class","assignment","Work",draft({queued:true,expectedVersion:-1}),null),/Invalid/);
 const saved=await s.saveAssignmentDraft("student-a","class","assignment","Work",draft({queued:true}),null);
 let claimed=await s.claimAssignmentDraft("student-a");await s.finishAssignmentDraft(claimed,{message:"Network unavailable",blocked:false});
 let current=await s.readOffline("student-a",saved.id);assert.equal(current.value.answer,"Saved answer");assert.equal(current.value.state,"queued");assert.equal(await s.claimAssignmentDraft("student-a"),null);
 claimed=await s.claimAssignmentDraft("student-a",Date.now()+300000);await s.finishAssignmentDraft(claimed,{message:"Deadline passed",blocked:true});
 assert.equal(await s.claimAssignmentDraft("student-a",Date.now()+900000),null);
 current=await s.readOffline("student-a",saved.id);assert.equal(current.value.state,"blocked");assert.equal(current.value.answer,"Saved answer");
});
test("expired upload lease is recoverable and an older completion cannot erase a new claim",async()=>{
 const {store:s}=setup();await s.saveAssignmentDraft("student-a","class","assignment","Work",draft({queued:true}),null);
 const first=await s.claimAssignmentDraft("student-a");const second=await s.claimAssignmentDraft("student-a",Date.now()+100000);
 assert.ok(second);assert.equal(await s.finishAssignmentDraft(first),false);assert.equal(await s.finishAssignmentDraft(second),true);
 assert.equal((await s.listOffline("student-a")).length,0);
});
test("cache eviction preserves unsent drafts and class removal only clears that class",async()=>{
 const {store:s}=setup();const saved=await s.saveAssignmentDraft("student-a","class","assignment","Work",draft(),null);
 for(let i=0;i<8;i++)await s.cacheOffline({id:`material-${i}`,owner:"student-a",classId:"other",target:String(i),kind:"material",title:"File",bytes:15*1024*1024,value:new Blob(["file"])});
 assert.ok(await s.readOffline("student-a",saved.id));assert.ok((await s.listOffline("student-a")).length<9);
 await s.purgeOffline("student-a","class");assert.equal(await s.readOffline("student-a",saved.id),null);assert.ok((await s.listOffline("student-a")).length>0);
});
test("offline identity rejects expired, mismatched or stale verified sessions",()=>{
 const data=new Map(),exports={};const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};
 const source=ts.transpileModule(fs.readFileSync("lib/offline-session.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{exports,Date,localStorage:storage,atob:value=>Buffer.from(value,"base64").toString("binary")});
 const token=exp=>`x.${Buffer.from(JSON.stringify({user_id:"a",exp})).toString("base64url")}.x`;
 const valid=token(Date.now()/1000+3600);storage.setItem("access_token",valid);exports.rememberOfflineSession({id:"a",status:"active"},valid);
 assert.equal(exports.offlineSession(valid).id,"a");assert.equal(exports.offlineSession(token(1)),null);
 data.set("edunexus:verified-offline:a",JSON.stringify({user:{id:"b",status:"active"},verifiedAt:Date.now()}));assert.equal(exports.offlineSession(valid),null);
 data.set("edunexus:verified-offline:a",JSON.stringify({user:{id:"a",status:"active"},verifiedAt:Date.now()-86400001}));assert.equal(exports.offlineSession(valid),null);
});
