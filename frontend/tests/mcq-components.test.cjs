const test=require('node:test'),assert=require('node:assert/strict'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {loadComponent}=require('./helpers/classroom-component-render.cjs');
const {MCQFields,MCQAnswer,optionOrder}=loadComponent('components/classroom/mcq-fields.tsx',{'./question-image-editor':{QuestionImageEditor:()=>null},'./question-content':{QuestionText:({text})=>React.createElement('span',null,text),QuestionPicture:()=>null},'./exam-presentation':{field:'field',outline:'button'}});
const q={id:'question',kind:'mcq',prompt:'Select primes',points:5,selection:'multiple',options:['2','4','3'],correct_options:[0,2],shuffle_options:true};
function nodes(tree,predicate){const out=[];function visit(n){if(!n||typeof n!=='object')return;if(predicate(n))out.push(n);React.Children.forEach(n.props?.children,visit)}visit(tree);return out;}
test('checkbox answers serialize canonical indices despite shuffled display order',()=>{
 let answer='';const tree=MCQAnswer({question:q,value:'2',attemptId:'attempt',onChange:v=>answer=v});
 const labels=nodes(tree,n=>n.type==='label'),two=labels[Array.from(optionOrder(q,'attempt')).indexOf(0)];
 nodes(two,n=>n.type==='input')[0].props.onChange();assert.equal(answer,'0,2');
 assert.deepEqual(Array.from(optionOrder(q,'attempt')),Array.from(optionOrder(q,'attempt')));assert.deepEqual(Array.from(optionOrder(q,'attempt')).sort(),[0,1,2]);
 const html=renderToStaticMarkup(React.createElement(MCQAnswer,{question:q,value:'0,2',attemptId:'attempt',onChange(){}}));assert.equal((html.match(/type="checkbox"/g)||[]).length,3);assert.equal((html.match(/checked=""/g)||[]).length,2);
});
test('removing an option adjusts the answer key instead of silently selecting option A',()=>{
 let patch;const tree=MCQFields({question:q,onChange:v=>patch=v});nodes(tree,n=>n.props?.['aria-label']==='Remove option 2')[0].props.onClick();assert.deepEqual(Array.from(patch.correct_options),[0,1]);
 const single=MCQFields({question:{...q,selection:'single',correct_option:1},onChange:v=>patch=v});nodes(single,n=>n.props?.['aria-label']==='Remove option 2')[0].props.onClick();assert.equal(patch.correct_option,undefined);
 const html=renderToStaticMarkup(React.createElement(MCQAnswer,{question:{...q,selection:'dropdown'},value:'2',attemptId:'attempt',onChange(){}}));assert.match(html,/<select/);assert.match(html,/value="2" selected/);
});
