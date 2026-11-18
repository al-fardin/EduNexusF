const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const exportsObject={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/question-import.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:exportsObject,TextEncoder});
const {parseQuestionText,previewItems,IMPORT_TEMPLATE}=exportsObject;
const plain=value=>JSON.parse(JSON.stringify(value));
test('CSV import handles quoted multiline text, checkbox keys and missing answer keys',()=>{
 const rows=parseQuestionText(IMPORT_TEMPLATE,'csv');assert.equal(rows[0].errors.length,0);assert.deepEqual(plain(rows[0].question.correct_options),[0,1]);
 const multiline='question,option_a,option_b,answer,points\n"First line\nSecond, line",Yes,No,B,3\nMissing key,One,Two,,2';
 const result=parseQuestionText(multiline,'csv');assert.equal(result[0].question.prompt,'First line\nSecond, line');assert.equal(result[0].question.correct_option,1);assert.match(result[1].errors.join(),/missing/);
 assert.throws(()=>parseQuestionText('question,question\nA,B','csv'),/Duplicate/);
 assert.throws(()=>parseQuestionText('question,option_a\n"bad,Yes','csv'),/Unclosed/);
});
test('Forms API JSON maps choice types and answer values without guessing keys',()=>{
 const data={items:[{title:'Select primes',questionItem:{question:{choiceQuestion:{type:'CHECKBOX',options:[{value:'2'},{value:'4'},{value:'3'}]},grading:{pointValue:5,correctAnswers:{answers:[{value:'3'},{value:'2'}]}}}}},{title:'Select city',questionItem:{question:{choiceQuestion:{type:'SELECT',options:[{value:'Dhaka'},{value:'Tokyo'}]},grading:{pointValue:2,correctAnswers:{answers:[{value:'Dhaka'}]}}}}},{title:'Section heading'}]};
 const rows=parseQuestionText(JSON.stringify(data),'json');assert.equal(rows[0].errors.length,0);assert.deepEqual(plain(rows[0].question.correct_options),[0,2]);assert.equal(rows[1].question.selection,'dropdown');assert.equal(rows[1].question.correct_option,0);assert.ok(rows[2].errors.length);
});
test('Aiken, TSV and EduNexus JSON retain keys and reject invalid formats',()=>{
 const rows=parseQuestionText('Select primes\nA. 2\nB. 4\nC. 3\nANSWER: A,C\n\nChoose truth\nA. True\nB. False\nANSWER: B','text');assert.equal(rows.length,2);assert.equal(rows[0].question.selection,'multiple');assert.equal(rows[1].question.correct_option,1);
 const tsv=parseQuestionText('question\toption_a\toption_b\tanswer\nPick one\tYes\tNo\t2','tsv');assert.equal(tsv[0].question.correct_option,1);
 const exported=parseQuestionText(JSON.stringify([{question:{kind:'mcq',prompt:'Choose one',points:1,options:['Yes','No'],correct_option:0},topic:'Logic',difficulty:'hard'}]),'json');assert.equal(exported[0].difficulty,'hard');assert.equal(exported[0].question.correct_option,0);
 assert.throws(()=>parseQuestionText('Choose one\nB. Wrong\nANSWER: B','text'),/consecutive/);
 assert.ok(previewItems([{kind:'mcq',prompt:'Question',points:1,selection:'multiple',options:['A','B'],correct_options:[0,0]}])[0].errors.length);
 assert.throws(()=>previewItems(Array(101).fill({})),/100/);
 assert.throws(()=>parseQuestionText('a'.repeat(2*1024*1024+1),'text'),/2 MB/);
});
