const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const {loadComponent}=require('./helpers/classroom-component-render.cjs');

test('confirmation waits for an explicit choice and resolves once',async()=>{
 const d=loadComponent('lib/action-dialog.ts',{});let settled=false;
 const pending=d.requestConfirm('Publish exam?').then(value=>{settled=true;return value});
 await Promise.resolve();assert.equal(settled,false);
 const id=d.currentDialog().id;d.settleDialog(id,true);d.settleDialog(id,false);
 assert.equal(await pending,true);assert.equal(d.currentDialog(),null);
});

test('queued dialogs keep independent responses and ignore stale button clicks',async()=>{
 const d=loadComponent('lib/action-dialog.ts',{});
 const first=d.requestConfirm('Delete?'),id=d.currentDialog().id;
 const second=d.requestText('Filename','main.cpp');d.settleDialog(id,false);
 assert.equal(await first,false);assert.equal(d.currentDialog().initialValue,'main.cpp');
 d.settleDialog(id,true);assert.equal(d.currentDialog().kind,'prompt');
 d.settleDialog(d.currentDialog().id,'answer.cpp');assert.equal(await second,'answer.cpp');
});

test('navigation cancels pending actions and prompts without confirming a mutation',async()=>{
 const d=loadComponent('lib/action-dialog.ts',{});let notifications=0;
 const unsubscribe=d.subscribeDialogs(()=>notifications++);
 const confirm=d.requestConfirm('Remove?'),prompt=d.requestText('Edit?'),notice=d.showNotice('Failed');
 d.cancelDialogs();assert.equal(await confirm,false);assert.equal(await prompt,null);await notice;
 assert.equal(d.currentDialog(),null);assert.equal(notifications,4);unsubscribe();
 d.requestConfirm('Unsubscribed');assert.equal(notifications,4);d.cancelDialogs();
});

test('application actions never invoke native confirm, prompt or alert popups',()=>{
 const violations=[];
 function scan(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true})){
  const file=path.join(folder,entry.name);if(entry.isDirectory()){scan(file);continue}
  if(!/\.[jt]sx?$/.test(file))continue;
  const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
  function visit(node){if(ts.isCallExpression(node)){
   const target=node.expression;
   if((ts.isIdentifier(target)&&['confirm','prompt','alert'].includes(target.text))||
      (ts.isPropertyAccessExpression(target)&&['window','globalThis'].includes(target.expression.getText(source))&&['confirm','prompt','alert'].includes(target.name.text)))violations.push(file);
  }ts.forEachChild(node,visit)}visit(source);
 }}
 for(const folder of ['app','components','providers'])scan(folder);
 assert.deepEqual(violations,[]);
});
