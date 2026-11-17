const test=require("node:test"),assert=require("node:assert/strict"),React=require("react");
const {audienceHarness,loadComponent}=require("./helpers/audience-render.cjs");
function find(node,predicate){if(!node||typeof node!=="object")return;if(predicate(node))return node;for(const child of React.Children.toArray(node.props?.children)){const match=find(child,predicate);if(match)return match;}}
test("advanced audience stays collapsed, optional, Everyone and does not fetch a preview by default",()=>{
 const h=audienceHarness();assert.match(h.html,/<option value="all" selected="">Everyone/);assert.doesNotMatch(h.html,/<details[^>]*open/);assert.doesNotMatch(h.html,/ required=/);assert.equal(h.options.enabled,false);assert.equal(h.changed,undefined);
});
test("explicit range, custom and mixed fields have labels and Bengali support",()=>{
 const html=audienceHarness({mode:"mixed",parity:"odd",ranges:[{from:1,to:50}],rolls:["088"]}).html;for(const text of ["Parity within ranges","From roll","To roll","Additional custom rolls","Exclude rolls (optional)","Numeric rules match parity AND any range"])assert.ok(html.includes(text),text);
 assert.match(audienceHarness({mode:"custom",rolls:["001"]}).html,/<textarea[^>]*required/);assert.match(audienceHarness(undefined,"bn").html,/আলাদা করে বেছে না নিলে সবাই পাবে/);
});
test("announcement creation without advanced choices keeps the existing Everyone payload",()=>{
 let payload;
 const {AnnouncementComposer}=loadComponent("components/classroom/announcement-composer.tsx",{"react":{...React,useState:()=>[{title:"Notice",content:"Class update"},()=>{}]},"@tanstack/react-query":{useQueryClient:()=>({}),useMutation:()=>({mutate:value=>payload=value})},"lucide-react":{},"./audience-fields":{AudienceFields:()=>null},"@/services/stream":{streamService:{}}});
 const tree=AnnouncementComposer({classroomId:"class"});find(tree,n=>n.type==="form").props.onSubmit({preventDefault(){}});assert.deepEqual(JSON.parse(JSON.stringify(payload)),{title:"Notice",content:"Class update"});
});
test("exam creation sends the selected audience and defaults to Everyone",()=>{
 for(const rule of [{mode:"all"},{mode:"odd"},{mode:"ranges",ranges:[{from:51,to:100}]}]){
 let payload,cursor=0;const values=[rule,"Valid exam","Instructions","2026-12-01T12:00","2026-12-01T13:00",30,false,0,[{id:"q1",kind:"mcq",prompt:"Choose",points:10,options:["A","B"],correct_option:0}]];
 const {ExamCreator}=loadComponent("components/classroom/exam-creator.tsx",{"react":{...React,useState:()=>[values[cursor++],()=>{}]},"@tanstack/react-query":{useMutation:()=>({mutate:value=>payload=value})},"./audience-fields":{},"@/services/audience":{EVERYONE:{mode:"all"}},"./exam-preview":{},"./schedule-check":{},"@/components/classroom/mobile-exam-option":{},"@/components/classroom/question-bank":{},"@/components/classroom/question-tester-upload":{},"lucide-react":{},"@/services/exams":{examService:{}},"./exam-presentation":{newQuestion:()=>values[8][0]}});
 const tree=ExamCreator({classroomId:"class",onClose(){}});find(tree,n=>n.type==="button"&&React.Children.toArray(n.props.children).includes("Save private draft")).props.onClick();assert.deepEqual(JSON.parse(JSON.stringify(payload.audience)),rule);
 }
});
