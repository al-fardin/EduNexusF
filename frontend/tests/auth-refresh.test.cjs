const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),vm=require("node:vm"),ts=require("typescript");
function setup(){
 const values=new Map([["access_token","old-access"],["refresh_token","old-refresh"]]);let logout=0,redirects=0,resolve,reject;
 const pending=new Promise((ok,no)=>{resolve=ok;reject=no;});const clients=[];
 const axios={isAxiosError:error=>error?.axios===true,create:()=>{const responses=[];const client=()=>Promise.resolve("retried");client.interceptors={request:{use:()=>{}},response:{use:(ok,error)=>responses.push(error)}};client.post=()=>pending;client.responses=responses;clients.push(client);return client;}};
 const state={accessToken:"old-access",user:{id:"old-user"},setAccessToken:value=>{state.accessToken=value;},logout:()=>{logout++;state.accessToken=null;state.user=null;}};
 const localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 const paths={};vm.runInNewContext(ts.transpileModule(fs.readFileSync("lib/return-path.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:paths,URL});
 const exports={};const source=ts.transpileModule(fs.readFileSync("lib/api.ts","utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(source,{exports,process:{env:{}},window:{localStorage,location:{pathname:"/classrooms",search:"",hash:"",replace:()=>{redirects++;}}},require:name=>name==="./return-path"?paths:name==="axios"?{default:axios}:{useAuthStore:{getState:()=>state}}});
 const refresh=()=>clients[0].responses[0]({response:{status:401},config:{url:"/protected",headers:{}}});
 return {refresh,resolve,reject,state,values,logout:()=>logout,redirects:()=>redirects};
}
test("network and server failures during refresh retain authentication and offline work",async()=>{
 for(const status of [undefined,503]){const s=setup();const result=s.refresh();const failure={axios:true,...status?{response:{status}}:{}};s.reject(failure);await assert.rejects(result,error=>error===failure);assert.equal(s.logout(),0);assert.equal(s.redirects(),0);assert.equal(s.values.get("refresh_token"),"old-refresh");}
});
test("a refresh rejected by the server clears the invalid session",async()=>{
 const s=setup();const result=s.refresh();s.reject({axios:true,response:{status:401}});await assert.rejects(result);assert.equal(s.logout(),1);assert.equal(s.redirects(),1);assert.equal(s.values.has("refresh_token"),false);
});
test("late refresh success or failure cannot replace or clear a different login",async()=>{
 for(const succeeds of [true,false]){const s=setup();const result=s.refresh();s.values.set("refresh_token","new-refresh");s.state.accessToken="new-access";s.state.user={id:"new-user"};if(succeeds)s.resolve({data:{data:{access_token:"stale-access",refresh_token:"stale-refresh"}}});else s.reject({axios:true,response:{status:401}});await assert.rejects(result);assert.equal(s.logout(),0);assert.equal(s.state.accessToken,"new-access");assert.equal(s.state.user.id,"new-user");assert.equal(s.values.get("refresh_token"),"new-refresh");}
});
