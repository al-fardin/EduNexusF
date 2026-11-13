const React = require("react");
const {renderToStaticMarkup} = require("react-dom/server");
const {loadComponent} = require("./classroom-component-render.cjs");
const {translate} = loadComponent("lib/translations.ts", {});
const classroomId = "88888888-8888-4888-8888-888888888888";
const inviteId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const prefs = (locale) => ({usePreferences: () => ({t: (text) => translate(locale, text), locale: locale === "bn" ? "bn-BD" : "en-US"})});
const utils=loadComponent("lib/utils.ts",{"clsx":require("clsx"),"tailwind-merge":require("tailwind-merge")});
const {Button:button}=loadComponent("components/ui/button.tsx",{"@base-ui/react/button":require("@base-ui/react/button"),"class-variance-authority":require("class-variance-authority"),"@/lib/utils":utils});
const empty = ({title}) => React.createElement("p",null,title);
const shell = ({open,children}) => open ? React.createElement("section",null,children) : null;
function policyComponent(locale="en") {
  return loadComponent("components/classroom/join-policy-fields.tsx", {"@/providers/preferences-provider":prefs(locale)}).JoinPolicyFields;
}
function policyMarkup(value,locale="en") {return renderToStaticMarkup(React.createElement(policyComponent(locale),{value,onChange(){}}));}
function commonMocks(locale,items) {
  return {
    "@/providers/preferences-provider":prefs(locale),
    "@/services/enrollment":{enrollment:{}},
    "@/store/auth-store":{useAuthStore:select=>select({user:{id:"student"}})},
    "@tanstack/react-query":{
      useQuery:()=>({}),
      useQueryClient:()=>({invalidateQueries:async()=>{}}),
      useInfiniteQuery:()=>({data:{pages:[{items,email_verified:true,pending_invitations:1,next_offset:-1,email_configured:false}]},dataUpdatedAt:Date.parse("2026-11-12T06:00:00Z"),hasNextPage:false}),
    },
    "@/components/ui/button":{Button:button},
    "@/components/ui/app-feedback":{ConfirmAction:()=>null,EmptyState:empty,ErrorState:()=>null},
    "@/components/ui/content-skeleton":{ContentSkeleton:()=>null},
    "@/components/ui/dialog":{Dialog:shell,DialogContent:({children})=>React.createElement("div",null,children),DialogHeader:({children})=>React.createElement("header",null,children),DialogTitle:({children})=>React.createElement("h2",null,children),DialogDescription:({children})=>React.createElement("p",null,children)},
    "@/services/exams":{examError:()=>"Fixture error"},
  };
}
function studentMarkup(locale="en") {
  const items=[{id:inviteId,kind:"invitation",classroom_id:classroomId,classroom_name:"Invitation class",teacher_name:"Amina",status:"pending",student_roll:"",reason:"",version:1,expires_at:"2026-11-19T06:00:00Z"},{id:"request",kind:"request",classroom_id:classroomId,classroom_name:"Pending class",teacher_name:"Amina",status:"pending",student_roll:"001",reason:"",version:1}];
  const mocks={...commonMocks(locale,items),"next/link":({children,...props})=>React.createElement("a",props,children),"next/navigation":{useSearchParams:()=>new URLSearchParams("invite="+inviteId),useRouter:()=>({push(){}})}};
  const {EnrollmentInbox}=loadComponent("components/workspace/enrollment-inbox.tsx",mocks);
  return renderToStaticMarkup(React.createElement(EnrollmentInbox));
}
function teacherMarkup(owner=true) {
  const items=[{id:"request",user_id:"student",name:"Rafi Ahmed",email:"student@example.invalid",student_roll:"001",status:"pending",reason:"",version:1,updated_at:"2026-11-12T06:00:00Z"}];
  const mocks={...commonMocks("en",items),"./join-policy-fields":{JoinPolicyFields:policyComponent()},"@/components/ui/reason-dialog":{ReasonDialog:()=>null}};
  const {ClassEnrollment}=loadComponent("components/classroom/class-enrollment.tsx",mocks);
  return renderToStaticMarkup(React.createElement(ClassEnrollment,{classId:classroomId,owner,open:true,onOpenChange(){}}));
}
function acceptMarkup(locale="en") {
  const mocks={...commonMocks(locale,[]),"next/link":()=>null,"next/navigation":{useSearchParams:()=>new URLSearchParams(),useRouter:()=>({push(){}})}};
  const {TestAccept}=loadComponent("components/workspace/enrollment-inbox.tsx",mocks,"\nexport {AcceptInvitation as TestAccept};\n");
  return renderToStaticMarkup(React.createElement(TestAccept,{item:{id:inviteId,classroom_id:classroomId,version:1},saved(){}}));
}
module.exports={policyMarkup,studentMarkup,teacherMarkup,acceptMarkup,loadComponent,policyComponent};
