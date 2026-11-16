const React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
const {loadComponent}=require("./classroom-component-render.cjs");
const {translate}=loadComponent("lib/translations.ts",{});
const utils=loadComponent("lib/utils.ts",{"clsx":require("clsx"),"tailwind-merge":require("tailwind-merge")});
const {Button}=loadComponent("components/ui/button.tsx",{"@base-ui/react/button":require("@base-ui/react/button"),"class-variance-authority":require("class-variance-authority"),"@/lib/utils":utils});
const classId="88888888-8888-4888-8888-888888888888";
const preview={rows:[{line:2,email:"student@example.invalid",state:"ready"},{line:3,email:"STUDENT@example.invalid",state:"duplicate"},{line:4,email:"invalid",state:"invalid"},{line:5,email:"joined@example.invalid",state:"member"}],ready:1,remaining:95,revision:"fixture-revision",created:0};
function mocks(locale="en"){return {"@/providers/preferences-provider":{usePreferences:()=>({t:text=>translate(locale,text),locale:locale==="bn"?"bn-BD":"en-US"})},"@/components/ui/button":{Button},"@/components/ui/app-feedback":{ErrorState:({message})=>React.createElement("p",{role:"alert"},message),EmptyState:({title})=>React.createElement("p",null,title),ConfirmAction:()=>null},"@/components/ui/content-skeleton":{ContentSkeleton:()=>null},"@/services/exams":{examError:e=>e.message},"@/store/auth-store":{useAuthStore:select=>select({user:{id:"student"}})}};}
function bulkHarness(locale="en",initialPreview=null){
 let cursor=0;const slots=["email\nstudent@example.invalid\n",initialPreview,false,"",null],calls=[];
 const fakeReact={...React,useRef:()=>({current:0}),useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],next=>{slots[i]=typeof next==="function"?next(slots[i]):next}]}};
 const {BulkInvitations}=loadComponent("components/classroom/enrollment-sharing.tsx",{...mocks(locale),react:fakeReact,"@/lib/clipboard":{},"@/services/enrollment":{enrollment:{async importInvitations(...args){calls.push(args);return args[2]==="commit"?{...preview,created:1}:preview}}}});
 return {calls,slots,render(){cursor=0;return BulkInvitations({classId,onCreated(){calls.push(["created"])}})}};
}
function bulkMarkup(locale="en"){return renderToStaticMarkup(bulkHarness(locale,preview).render());}
function courseworkMarkup(locale="en"){
 const {StudentCoursework}=loadComponent("components/workspace/student-coursework.tsx",{...mocks(locale),"next/link":({children,...props})=>React.createElement("a",props,children),"@/lib/academic-tools":{resourceLink:({id})=>`/student/classrooms/${classId}?tab=classwork&work=assignments&assignment=${id}`},"@/services/academic-tools":{},"@tanstack/react-query":{useQuery:()=>({data:{items:[{id:"work",title:"Algebra problem set",due_at:"2026-12-01T12:00:00Z",maximum:100,score:80,state:"graded",feedback:"Explain the final step",rubric:[{id:"criterion",title:"Accuracy",maximum:100,description:"Explain each step"}],rubric_scores:{criterion:80}},{id:"missing",title:"Missing problem set",due_at:"2026-11-01T12:00:00Z",maximum:100,score:null,state:"missing",feedback:"",rubric:[],rubric_scores:{}}],next_offset:-1}})}});
 return renderToStaticMarkup(React.createElement(StudentCoursework,{classId,student:"student"}));
}
function find(node,predicate){if(!node||typeof node!=="object")return; if(predicate(node))return node;for(const child of React.Children.toArray(node.props?.children)){const found=find(child,predicate);if(found)return found;}}
function scheduleMarkup(locale="en"){
 const shell=({children})=>React.createElement("section",null,children);
 const {ContentSchedules}=loadComponent("components/classroom/content-schedules.tsx",{...mocks(locale),"@/services/content-schedules":{},"@/components/ui/dialog":{Dialog:shell,DialogContent:shell,DialogHeader:shell,DialogTitle:({children})=>React.createElement("h2",null,children),DialogDescription:({children})=>React.createElement("p",null,children)},"@tanstack/react-query":{useQueryClient:()=>({}),useInfiniteQuery:()=>({data:{pages:[{items:[{id:"work",kind:"assignment",title:"Scheduled algebra lesson",publish_at:"2026-12-01T12:00:00Z",state:"scheduled",version:1,error:""}]}]}})}});
 return renderToStaticMarkup(React.createElement(ContentSchedules,{classId,open:true,onOpenChange(){}}));
}
module.exports={bulkHarness,bulkMarkup,courseworkMarkup,scheduleMarkup,find};
