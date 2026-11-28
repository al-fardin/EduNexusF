const test=require('node:test'),assert=require('node:assert/strict');
const {loadComponent}=require('./helpers/classroom-component-render.cjs');
const {parseNativePushStatus}=loadComponent('lib/native-push-status.ts',{});

test('a broken or partially initialized native notification bridge cannot crash rendering',()=>{
 for(const raw of ['{broken','undefined','null','[]','true','123','"text"',undefined,null,{},'{}'])assert.equal(parseNativePushStatus(raw),null);
});

test('native permissions are strict booleans and malformed user binding is rejected',()=>{
 for(const input of [{configured:'false',permission:true,enabled:true},{configured:true,permission:'granted',enabled:true},{configured:true,permission:true,enabled:true,user:4}])assert.equal(parseNativePushStatus(JSON.stringify(input)),null);
});

test('valid native notification state retains its account binding',()=>{
 const input={configured:true,permission:false,enabled:false,user:'student-id'};
 assert.equal(JSON.stringify(parseNativePushStatus(JSON.stringify(input))),JSON.stringify(input));
 assert.equal(parseNativePushStatus('{"configured":false,"permission":false,"enabled":false,"user":null}').user,undefined);
});
