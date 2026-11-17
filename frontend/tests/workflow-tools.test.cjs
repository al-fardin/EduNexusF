const test=require("node:test"),assert=require("node:assert/strict"),React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
const {loadComponent}=require("./helpers/classroom-component-render.cjs");
const prefs={usePreferences:()=>({t:s=>s,locale:"en-US"})};
const wrapper=({children,...props})=>React.createElement("button",props,children);
function find(node,predicate){if(!node||typeof node!=="object")return;if(predicate(node))return node;for(const child of React.Children.toArray(node.props?.children)){const found=find(child,predicate);if(found)return found;}}
test("bulk section transfer waits for confirmation and sends selected roster versions",async()=>{
 const chosen={a:{id:"a",name:"Amina",roll:"001",version:3},b:{id:"b",name:"Rafi",roll:"002",version:5}},slots=["",chosen,"section-a","Approved section change",true,false,"",""],calls=[];let cursor=0;
 function Confirm(){}
 const {BulkSection}=loadComponent("components/classroom/bulk-section.tsx",{react:{...React,useState:()=>[slots[cursor++],()=>{}]},"@tanstack/react-query":{useQuery:()=>({data:[{id:"section-a",name:"A"}]}),useInfiniteQuery:()=>({data:{pages:[{items:Object.values(chosen)}]}}),useQueryClient:()=>({invalidateQueries:async()=>{}})},"@/services/sections":{sections:{bulk:async(...args)=>calls.push(args)}},"@/store/auth-store":{useAuthStore:fn=>fn({user:{id:"teacher"}})},"@/providers/preferences-provider":prefs,"@/components/ui/button":{Button:wrapper},"@/components/ui/content-skeleton":{},"@/components/ui/app-feedback":{ConfirmAction:Confirm},"@/services/exams":{examError:String}});
 const tree=BulkSection({classId:"class"});assert.equal(calls.length,0);const confirm=find(tree,n=>n.type===Confirm);assert.match(confirm.props.description,/Selected students: 2/);confirm.props.onConfirm();await new Promise(setImmediate);assert.equal(calls.length,1);assert.deepEqual(Array.from(calls[0][1],s=>s.version),[3,5]);assert.equal(calls[0][2],"section-a");assert.equal(calls[0][3],"Approved section change");
});
test("trash form cannot restore on Enter and keeps the deleted version in the API request",async()=>{
 let cursor=0;const calls=[],item={id:"file",title:"Lecture",kind:"material",deleted_at:"2026-11-17T04:30:00.123456Z"},slots=[item,"Restore mistaken deletion",false,"",""];
 const service=loadComponent("services/workflow-tools.ts",{"@/lib/api":{api:{post:async(...args)=>calls.push(args)}}}).workflowTools;
 const {TrashContents}=loadComponent("components/workspace/trash.tsx",{react:{...React,useState:()=>[slots[cursor++],()=>{}]},"@tanstack/react-query":{useInfiniteQuery:()=>({data:{pages:[{items:[item]}]}}),useQueryClient:()=>({})},"@/services/workflow-tools":{workflowTools:service},"@/store/auth-store":{useAuthStore:fn=>fn({user:{id:"teacher"}})},"@/providers/preferences-provider":prefs,"@/components/ui/button":{Button:wrapper},"@/components/ui/content-skeleton":{},"@/components/ui/app-feedback":{},"@/services/exams":{}});
 const tree=TrashContents({classId:"class"});let prevented=false;find(tree,n=>n.type==="form").props.onSubmit({preventDefault(){prevented=true}});assert.equal(prevented,true);assert.equal(calls.length,0);
 await service.restore(item,"Restore mistaken deletion","class");assert.equal(calls[0][0],"/classrooms/class/trash/material/file/restore");assert.equal(calls[0][1].deleted_at,item.deleted_at);
});
test("personal timing labels the student roll and explains an explicit deadline reset",()=>{
 const {TimingForm}=loadComponent("components/classroom/personal-timing.tsx",{"@tanstack/react-query":{useQueryClient:()=>({})},"@/services/workflow-tools":{},"@/store/auth-store":{},"@/providers/preferences-provider":prefs,"@/components/ui/button":{Button:wrapper},"@/components/ui/content-skeleton":{},"@/components/ui/app-feedback":{},"@/services/exams":{}},"\nexport {TimingForm};");
 const html=renderToStaticMarkup(React.createElement(TimingForm,{classId:"class",resources:[{id:"assignment",kind:"assignment",title:"Essay"}],editing:{resource_id:"assignment",roll:"001",version:2,due_at:null},onDone(){}}));assert.match(html,/Blank restores the class deadline/);assert.match(html,/Personal deadline/);assert.match(html,/readOnly=""/);assert.doesNotMatch(html,/Extra minutes/);
});
test("audience preview passes the selected or excluded page without changing the rule",async()=>{
 let request;const {previewAudience}=loadComponent("services/audience.ts",{"@/lib/api":{api:{post:async(...args)=>{request=args;return {data:{data:{students:[],next_offset:-1}}}}}}});
 const rule={mode:"odd",section_ids:["section-a"]};await previewAudience("class",rule,undefined,"excluded",50);assert.equal(request[1],rule);assert.equal(request[2].params.selection,"excluded");assert.equal(request[2].params.offset,50);
});
