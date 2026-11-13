const test=require("node:test"),assert=require("node:assert/strict");
const React=require("react");
const {policyMarkup,studentMarkup,teacherMarkup,acceptMarkup,loadComponent}=require("./helpers/enrollment-render.cjs");

test("class creation sends selected approval, code access and expiry together",()=>{
  let payload;
  const policy={join_mode:"approval",code_join_enabled:false,class_code_expires_at:"2026-12-01T12:00:00Z"};
  const page=loadComponent("app/instructor/classrooms/create/page.tsx",{
    react:{...React,useState:initial=>[initial?.join_mode?policy:{name:"  Database Systems ",section:" A ",subject:" CSE ",room:" 101 ",description:" Notes "},()=>{}]},
    "@/components/classroom/join-policy-fields":{JoinPolicyFields:()=>null},
    "@tanstack/react-query":{useMutation:()=>({mutate:data=>{payload=data}})},
    "lucide-react":new Proxy({},{get:()=>()=>null}),
    "next/link":()=>null,
    "next/navigation":{useRouter:()=>({push(){}})},
    "@/components/auth/auth-guard":{AuthGuard:()=>null},
    "@/services/classroom":{classroomService:{}},
  }).default();
  function findForm(node){if(!node||typeof node!=="object")return null;if(node.type==="form")return node;for(const child of [].concat(node.props?.children??[])){const found=findForm(child);if(found)return found}return null}
  const form=findForm(page);assert.ok(form);form.props.onSubmit({preventDefault(){}});
  assert.equal(payload.join_mode,"approval");assert.equal(payload.code_join_enabled,false);assert.equal(payload.class_code_expires_at,policy.class_code_expires_at);assert.equal(payload.name,"Database Systems");assert.equal(payload.section,"A");
});
test("join policy renders direct/approval, expiry and invitation-only states",()=>{
 const direct=policyMarkup({join_mode:"direct",code_join_enabled:true,class_code_expires_at:null});assert.match(direct,/<option value="direct" selected="">/);assert.doesNotMatch(direct,/type="datetime-local"/);
 const approval=policyMarkup({join_mode:"approval",code_join_enabled:true,class_code_expires_at:"2026-12-01T12:00:00Z"});assert.match(approval,/<option value="approval" selected="">/);assert.match(approval,/type="datetime-local" required=""/);
 const disabled=policyMarkup({join_mode:"approval",code_join_enabled:false,class_code_expires_at:null});assert.doesNotMatch(disabled,/<select/);assert.match(disabled,/Email invitations can be accepted without a class code/);
});
test("enrollment UI separates owner settings, teacher review and student consent",()=>{
 assert.match(teacherMarkup(true),/Join settings/);assert.doesNotMatch(teacherMarkup(false),/Join settings/);assert.match(teacherMarkup(false),/Approve join request/);
 const student=studentMarkup();assert.match(student,/Accept invitation/);assert.match(student,/Decline invitation/);assert.match(student,/Withdraw join request/);assert.doesNotMatch(student,/Approve join request|Open classroom/);
});
test("invitation acceptance requires a valid roll and supports Bengali labels",()=>{
 const markup=acceptMarkup();assert.match(markup,/<input(?=[^>]*name="roll")(?=[^>]*required="")/);assert.match(markup,/pattern="\[A-Za-z0-9\]/);assert.match(markup,/Accept &amp; join classroom/);
 assert.match(studentMarkup("bn"),/আমন্ত্রণ গ্রহণ করুন/);assert.match(acceptMarkup("bn"),/আমন্ত্রণ গ্রহণ করে ক্লাসে যোগ দিন/);
});
