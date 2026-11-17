const React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
const {loadComponent}=require("./classroom-component-render.cjs");
const {translate}=loadComponent("lib/translations.ts",{});
const utils=loadComponent("lib/utils.ts",{"clsx":require("clsx"),"tailwind-merge":require("tailwind-merge")});
const {Button}=loadComponent("components/ui/button.tsx",{"@base-ui/react/button":require("@base-ui/react/button"),"class-variance-authority":require("class-variance-authority"),"@/lib/utils":utils});
const student={id:"one",name:"Rafi Ahmed",roll:"001",version:2},resource={id:"assignment",kind:"assignment",title:"Database systems · Research assignment"};
function workflowMarkup(kind,language="en"){
 let cursor=0;const item={id:"one",title:"Database systems · Lecture notes",kind:"material",deleted_at:new Date().toISOString()};
 const slots=kind==="bulk"?["",{one:student},"a","Approved section transfer",false,false,"",""]:kind==="trash"?[item,"Restore accidental deletion",false,"",""]:kind==="schedule"?[true,false,"",""]:[];
 const mocks={react:{...React,useEffect(){},useState:initial=>[cursor in slots?slots[cursor++]:typeof initial==="function"?initial():initial,()=>{}]},"@/providers/preferences-provider":{usePreferences:()=>({t:text=>translate(language,text),locale:language==="bn"?"bn-BD":"en-US"})},"@/store/auth-store":{useAuthStore:fn=>fn({user:{id:"teacher"}})},"@/components/ui/button":{Button},"@/components/ui/app-feedback":{ErrorState:({message})=>React.createElement("p",{role:"alert"},message),EmptyState:({title})=>React.createElement("p",null,title),ConfirmAction:()=>null},"@/components/ui/content-skeleton":{ContentSkeleton:()=>null},"@/services/exams":{examError:String},"@/services/sections":{},"@/services/workflow-tools":{},"@/services/content-schedules":{},"@tanstack/react-query":{useQueryClient:()=>({}),useInfiniteQuery:()=>({data:{pages:[{items:kind==="trash"?[item]:[student]}]}}),useQuery:()=>({data:kind==="schedule"?[{id:"draft",title:"Final examination · Database systems",status:"draft"}]:[{id:"a",name:"Section A"}]})}};

 if(kind==="planner"){
  mocks["next/link"]=({children,...props})=>React.createElement("a",props,children);
  mocks["@/services/academic-tools"]={};
  const tools=loadComponent("lib/academic-tools.ts",{"@/services/workspace":{classPath:(id,role)=>`/${role==="teacher"?"instructor":"student"}/classrooms/${id}`}});
  mocks["@/lib/academic-tools"]=tools;
  mocks["@tanstack/react-query"].useQuery=()=>({data:{items:[{id:"exam",kind:"exam",title:"Database systems · Final examination",at:new Date(Date.now()+3600000).toISOString(),ends_at:new Date(Date.now()+7200000).toISOString(),classroom_id:"class",classroom_name:"Database systems",role:"student"}],truncated:false}});
 }
 let component,props={classId:"class"};
 if(kind==="bulk")component=loadComponent("components/classroom/bulk-section.tsx",mocks).BulkSection;
 if(kind==="timing"){component=loadComponent("components/classroom/personal-timing.tsx",mocks,"\nexport {TimingForm};").TimingForm;props={...props,resources:[resource],editing:null,onDone(){}}}
 if(kind==="trash")component=loadComponent("components/workspace/trash.tsx",mocks).TrashContents;
 if(kind==="planner")component=loadComponent("components/workspace/planner.tsx",mocks).StudentPlanner;
 if(kind==="schedule")component=loadComponent("components/classroom/exam-publish-schedule.tsx",mocks).ExamPublishSchedule;
 return renderToStaticMarkup(React.createElement(component,props));
}
module.exports={workflowMarkup};
