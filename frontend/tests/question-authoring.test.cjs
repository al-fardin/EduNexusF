const test=require('node:test'),assert=require('node:assert/strict'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {loadComponent}=require('./helpers/classroom-component-render.cjs');
const imageModule=loadComponent('lib/question-images.ts',{});
const {QuestionText}=loadComponent('components/classroom/question-content.tsx',{'katex':require('katex'),'next/image':()=>null,'@/lib/question-images':imageModule});
const {duplicateWarnings}=loadComponent('lib/question-duplicates.ts',{});
const parser=loadComponent('lib/question-import.ts',{'./question-images':imageModule});
function nodes(tree,predicate){const found=[];function visit(n){if(!n||typeof n!=='object')return;if(predicate(n))found.push(n);React.Children.forEach(n.props?.children,visit)}visit(tree);return found;}
test('equations render accessible math while authored HTML and unsafe links remain inert',()=>{
 const html=renderToStaticMarkup(React.createElement(QuestionText,{text:'Solve $x^2 + 1$ and $$\\frac{a}{b}$$ <script>alert(1)</script> $\\href{javascript:alert(1)}{bad}$'}));
 assert.match(html,/<math/);assert.match(html,/katex-display/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script|<a\s|href="javascript:/);
 const broken=renderToStaticMarkup(React.createElement(QuestionText,{text:'$\\frac{$'}));assert.match(broken,/frac/);
});
test('possible duplicates are identified across an import, current exam and bank',()=>{
 const q=prompt=>({kind:'mcq',prompt,options:['A','B'],points:1,id:prompt});const warnings=duplicateWarnings([q(' Prime   numbers '),q('prime numbers'),q('Another question')],[q('Prime numbers')],[{prompt:'Another question'}]);
 assert.match(warnings[0].join(),/this exam/);assert.match(warnings[1].join(),/import row 1/);assert.match(warnings[2].join(),/question bank/);
});
test('Bangla choice labels and answer keys import without guessing missing keys',()=>{
 const rows=parser.parseQuestionText('১. মৌলিক সংখ্যা বেছে নাও\nক. ২\nখ. ৪\nগ. ৩\nউত্তর: ক,গ','text');assert.equal(rows[0].errors.length,0);assert.deepEqual(Array.from(rows[0].question.correct_options),[0,2]);
 const noKey=parser.parseQuestionText('Choose a prime\nA. 2\nB. 4','text')[0];assert.match(noKey.errors.join(),/missing/);
 const corrected=parser.previewItems([{...noKey,question:{...noKey.question,correct_option:0}}])[0];assert.equal(corrected.errors.length,0);
});
test('editing an import row revalidates it and saving waits for an explicit selection',async()=>{
 const invalid={line:1,question:{id:'import-0',kind:'mcq',prompt:'Choose a prime',points:1,options:['2','4'],source_bank_id:'trusted-bank',source_bank_version:2},topic:'Logic',difficulty:'easy',errors:['Answer key is missing']};
 const slots=[true,'paste','text','',[invalid],[],'',false,'',false,[],'',0];let cursor=0,added=null;const Row=()=>null;
 const fake={...React,useEffect(){},useState(initial){const index=cursor++;if(!(index in slots))slots[index]=initial;return [slots[index],value=>slots[index]=typeof value==='function'?value(slots[index]):value]}};
 const {QuestionImport}=loadComponent('components/classroom/question-import.tsx',{'react':fake,'@tanstack/react-query':{useQuery:()=>({})},'@/lib/question-duplicates':{duplicateWarnings},'@/services/question-bank':{},'./question-import-row':{QuestionImportRow:Row},'./question-scan-import':{},'@/lib/client-id':{clientId:()=> 'fresh-question-id'},'@/lib/question-import':parser,'@/lib/question-import-files':{},'@/services/exams':{examError:e=>e.message},'./exam-presentation':{}});
 function render(){cursor=0;return QuestionImport({classroomId:'class',onImport:rows=>{added=rows}})}
 let tree=render();assert.equal(added,null);nodes(tree,n=>n.type===Row)[0].props.onChange({correct_option:0,topic:'Numbers',difficulty:'hard'});assert.equal(slots[4][0].errors.length,0);assert.equal(slots[4][0].question.source_bank_id,'trusted-bank');assert.equal(slots[4][0].question.source_bank_version,2);assert.equal(slots[4][0].topic,'Numbers');assert.equal(slots[4][0].difficulty,'hard');
 tree=render();nodes(tree,n=>n.type===Row)[0].props.onSelect();tree=render();const add=nodes(tree,n=>n.type==='button'&&n.props.children==='Add selected questions')[0];assert.equal(add.props.disabled,false);await add.props.onClick();
 assert.equal(added.length,1);assert.equal(added[0].question.correct_option,0);assert.equal(added[0].question.id,'fresh-question-id');
});
