const test=require('node:test'),assert=require('node:assert/strict'),React=require('react');
const {loadComponent}=require('./helpers/classroom-component-render.cjs');
const images=loadComponent('lib/question-images.ts',{}),parser=loadComponent('lib/question-import.ts',{'./question-images':images}),readiness=loadComponent('lib/exam-readiness.ts',{'./question-import':parser});
const {parseExamDisplay}=loadComponent('lib/exam-display.ts',{});
function nodes(tree,predicate){const out=[];function visit(n){if(!n||typeof n!=='object')return;if(predicate(n))out.push(n);React.Children.forEach(n.props?.children,visit)}visit(tree);return out;}
test('readiness identifies editable fields and never treats missing keys as publishable',()=>{
 const draft={title:'Final exam',description:'',starts_at:'2030-01-01T10:00:00Z',ends_at:'2030-01-01T11:00:00Z',duration_minutes:30,questions:[{id:'q',kind:'mcq',prompt:'Select prime',points:5,options:['2','4']}]};
 let report=readiness.inspectDraft(draft,0);assert.equal(report.ready,false);assert.ok(report.issues.some(i=>i.question_id==='q'&&/missing/.test(i.message)));
 draft.questions[0].correct_option=0;report=readiness.inspectDraft(draft,0);assert.equal(report.ready,true);assert.equal(report.total_points,5);
 draft.ends_at=draft.starts_at;assert.ok(readiness.inspectDraft(draft,0).issues.some(i=>i.field==='starts_at'));
});
test('exam display defaults stay optional and malformed stored settings cannot enable them',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(parseExamDisplay('broken'))),{size:'standard',contrast:false,descriptions:false});
 assert.equal(parseExamDisplay('{"size":"huge","contrast":"true","descriptions":1}').contrast,false);
 const selected=parseExamDisplay('{"size":"larger","contrast":true,"descriptions":true}');assert.equal(selected.size,'larger');assert.equal(selected.contrast,true);
});
test('set generation is preview-only and approval forwards the reviewed snapshot receipt',async()=>{
 const slots=[2,'shuffle',null,false,false,'',''];let cursor=0;const calls=[];const preview={sets:[{id:'a',label:'A',questions:[]},{id:'b',label:'B',questions:[]}],receipt:'signed-preview',warnings:[],total_points:10};
 const fake={...React,useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v]}};
 const {ExamSets}=loadComponent('components/classroom/exam-sets.tsx',{react:fake,'@tanstack/react-query':{useQueryClient:()=>({invalidateQueries:async()=>{}})},'@/lib/api':{api:{post:async(path,body)=>{calls.push({path,body});return {data:{data:preview}}}}},'@/services/exams':{examError:e=>e.message},'./exam-preview':{},'./exam-presentation':{}});
 function render(){cursor=0;return ExamSets({exam:{id:'exam',classroom_id:'class',title:'Final',duration_minutes:30}})}
 let tree=render();assert.equal(calls.length,0);nodes(tree,n=>n.type==='button'&&n.props.children==='Generate preview')[0].props.onClick();await new Promise(r=>setImmediate(r));assert.equal(calls.length,1);assert.match(calls[0].path,/preview$/);
 tree=render();let approve=nodes(tree,n=>n.type==='button'&&n.props.children==='Approve & create private drafts')[0];assert.equal(approve.props.disabled,true);
 nodes(tree,n=>n.type==='input'&&n.props.type==='checkbox')[0].props.onChange({target:{checked:true}});tree=render();approve=nodes(tree,n=>n.type==='button'&&n.props.children==='Approve & create private drafts')[0];assert.equal(approve.props.disabled,false);approve.props.onClick();await new Promise(r=>setImmediate(r));assert.match(calls[1].path,/approve$/);assert.equal(calls[1].body.receipt,'signed-preview');assert.equal(calls[1].body.sets,preview.sets);
});
test('question-bank hierarchy clears stale child selections when subject changes',()=>{
 let selected;const {BankFiltersFields}=loadComponent('components/classroom/bank-catalogue-tools.tsx',{react:{...React,useState:initial=>[initial,()=>{}]},'@tanstack/react-query':{useQuery:()=>({data:[{subject:'Math',chapter:'Numbers',topic:'Primes'},{subject:'Physics',chapter:'Motion',topic:'Speed'}]})},'@/services/question-bank':{},'@/services/exams':{},'./exam-presentation':{}});
 const tree=BankFiltersFields({classId:'class',value:{subject:'Math',chapter:'Numbers',topic:'Primes'},onChange:v=>selected=v});const subject=nodes(tree,n=>n.type==='select')[0];assert.equal(nodes(subject,n=>n.type==='option'&&n.props.children==='Physics').length,1);subject.props.onChange({target:{value:'Physics'}});assert.equal(selected.subject,'Physics');assert.equal(selected.chapter,'');assert.equal(selected.topic,'');
});

test('exam display preferences persist per account and do not change answers',()=>{
 let user='student-a';const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 const display=loadComponent('lib/exam-display.ts',{});const globals={localStorage:storage,window:{dispatchEvent(){}},Event};
 const {ExamReadingView}=loadComponent('components/classroom/exam-reading-view.tsx',{react:{...React,useSyncExternalStore:(_,get)=>get()},'@/store/auth-store':{useAuthStore:select=>select({user:{id:user}})},'@/providers/preferences-provider':{usePreferences:()=>({t:s=>s})},'@/lib/exam-display':display},'',globals);
 const props={questions:[],children:React.createElement('p',null,'Answers stay unchanged')};let tree=ExamReadingView(props);assert.equal(tree.props['data-exam-contrast'],false);nodes(tree,n=>n.type==='input'&&n.props.type==='checkbox')[0].props.onChange({target:{checked:true}});tree=ExamReadingView(props);assert.equal(tree.props['data-exam-contrast'],true);user='student-b';assert.equal(ExamReadingView(props).props['data-exam-contrast'],false);user='student-a';assert.equal(ExamReadingView(props).props['data-exam-contrast'],true);
});

test("failed readiness recheck clears a previously successful report", async () => {
  const slots = [null, false, ""];
  let cursor = 0,
    fail = false,
    user = "teacher",
    resolveReadiness;
  const refs = [];
  let refCursor = 0;
  const fake = {
    ...React,
    useEffect() {},
    useRef(initial) {
      const i = refCursor++;
      return refs[i] ?? (refs[i] = { current: initial });
    },
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [
        slots[i],
        (v) => (slots[i] = typeof v === "function" ? v(slots[i]) : v),
      ];
    },
  };
  const { ExamReadiness } = loadComponent(
    "components/classroom/exam-readiness.tsx",
    {
      react: fake,
      "next/link": () => null,
      "@tanstack/react-query": { useQueryClient: () => ({}) },
      "@/store/auth-store": {
        useAuthStore: (select) => select({ user: { id: user } }),
      },
      "@/lib/api": {
        api: {
          get: async () => {
            if (fail) throw Error("network");
            if (resolveReadiness === "pending")
              return new Promise((resolve) => {
                resolveReadiness = resolve;
              });
            return {
              data: { data: { ready: true, total_points: 5, issues: [] } },
            };
          },
          post: async () => ({ data: { data: { items: [] } } }),
        },
      },
      "@/lib/exam-readiness": readiness,
      "@/services/exams": {
        examService: { teacherExam: async () => ({ exam: {}, questions: [] }) },
        examError: (e) => e.message,
      },
      "./exam-presentation": {},
    },
  );
  function render(classId = "class") {
    cursor = 0;
    refCursor = 0;
    return ExamReadiness({ classId, examId: "exam" });
  }
  const button = (tree) =>
    nodes(
      tree,
      (n) =>
        n.type === "button" &&
        ["Check saved data & schedule", "Checking…"].includes(n.props.children),
    )[0];
  button(render()).props.onClick();
  await new Promise((r) => setImmediate(r));
  assert.equal(
    nodes(render(), (n) => n.props.children === "Publish checked exam").length,
    1,
  );
  assert.equal(
    nodes(
      render("other-class"),
      (n) => n.props.children === "Publish checked exam",
    ).length,
    0,
  );
  user = "other-teacher";
  assert.equal(
    nodes(render(), (n) => n.props.children === "Publish checked exam").length,
    0,
  );
  user = "teacher";
  fail = true;
  button(render()).props.onClick();
  await new Promise((r) => setImmediate(r));
  assert.equal(
    nodes(render(), (n) => n.props.children === "Publish checked exam").length,
    0,
  );
  // An older successful check must not overwrite a more recent failure.
  fail = false;
  resolveReadiness = "pending";
  button(render()).props.onClick();
  await new Promise((r) => setImmediate(r));
  const finishOlder = resolveReadiness;
  fail = true;
  button(render()).props.onClick();
  await new Promise((r) => setImmediate(r));
  finishOlder({ data: { data: { ready: true, total_points: 5, issues: [] } } });
  await new Promise((r) => setImmediate(r));
  assert.equal(
    nodes(render(), (n) => n.props.children === "Publish checked exam").length,
    0,
  );
});

test("local readiness catches server byte limits and invalid question identifiers", () => {
  const draft = {
    title: "Valid exam",
    description: "",
    starts_at: "2030-01-01T10:00:00Z",
    ends_at: "2030-01-01T11:00:00Z",
    duration_minutes: 30,
    questions: [
      {
        id: "q",
        kind: "mcq",
        prompt: "Choose one",
        points: 1,
        options: ["A", "B"],
        correct_option: 0,
      },
    ],
  };
  assert.equal(
    readiness.inspectDraft({ ...draft, title: "ক".repeat(67) }, 0).ready,
    false,
  );
  assert.equal(
    readiness.inspectDraft({ ...draft, description: "ক".repeat(1667) }, 0)
      .ready,
    false,
  );
  assert.equal(
    readiness.inspectDraft(
      { ...draft, questions: [{ ...draft.questions[0], id: "" }] },
      0,
    ).ready,
    false,
  );
  assert.equal(
    readiness.inspectDraft({ ...draft, title: "পরীক্ষা" }, 0).ready,
    true,
  );
});
