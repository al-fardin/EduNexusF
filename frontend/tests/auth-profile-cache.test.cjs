const test=require('node:test'),assert=require('node:assert/strict');
const {loadComponent}=require('./helpers/classroom-component-render.cjs');
const {AxiosHeaders}=require('axios');

function fixture(onGet){
 const values=new Map([['access_token','old-access']]);
 const storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 const offline=loadComponent('lib/offline-session.ts',{},'',{localStorage:storage});
 const {authService}=loadComponent('services/auth.ts',{
  '@/lib/api':{api:{get:async()=>onGet(values)}},
  '@/lib/offline-session':offline,
  '@/lib/offline-resources':{unavailableNetwork:()=>false},
 },'',{window:{localStorage:storage},localStorage:storage});
 return{values,authService};
}

test('verified offline profile is refreshed using the token actually sent after rotation',async()=>{
 const f=fixture(values=>{values.set('access_token','rotated-access');return{data:{data:{id:'student',status:'active'}},config:{headers:{Authorization:'Bearer rotated-access'}}}});
 await f.authService.me();
 assert.ok(f.values.has('edunexus:verified-offline:student'));
});

test('a late profile from a previous account cannot recreate its purged offline cache',async()=>{
 const f=fixture(values=>{values.set('access_token','other-account-access');return{data:{data:{id:'previous-student',status:'active'}},config:{headers:{Authorization:'Bearer old-access'}}}});
 await f.authService.me();
 assert.equal(f.values.has('edunexus:verified-offline:previous-student'),false);
});

test('rotated profile verification accepts normalized lower-case authorization headers',async()=>{
 const f=fixture(values=>{values.set('access_token','rotated-access');return{data:{data:{id:'student',status:'active'}},config:{headers:{authorization:'Bearer rotated-access'}}}});
 await f.authService.me();assert.ok(f.values.has('edunexus:verified-offline:student'));
});

test('profile verification reads the actual AxiosHeaders used by the browser client',async()=>{
 const f=fixture(values=>{values.set('access_token','rotated-access');return{data:{data:{id:'student',status:'active'}},config:{headers:new AxiosHeaders({authorization:'Bearer rotated-access'})}}});
 await f.authService.me();assert.ok(f.values.has('edunexus:verified-offline:student'));
});
