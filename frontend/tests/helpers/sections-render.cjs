const React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
const {loadComponent}=require("./classroom-component-render.cjs");
const {translate}=loadComponent("lib/translations.ts",{});
const utils=loadComponent("lib/utils.ts",{"clsx":require("clsx"),"tailwind-merge":require("tailwind-merge")});
const {Button}=loadComponent("components/ui/button.tsx",{"@base-ui/react/button":require("@base-ui/react/button"),"class-variance-authority":require("class-variance-authority"),"@/lib/utils":utils});
const A="11111111-1111-4111-8111-111111111111",B="22222222-2222-4222-8222-222222222222",choices=[{id:A,name:"A",version:1,students:1},{id:B,name:"B",version:1,students:1}];
function common(locale){return {"@/providers/preferences-provider":{usePreferences:()=>({t:text=>translate(locale,text),locale:locale==="bn"?"bn-BD":"en-US"})},"@/store/auth-store":{useAuthStore:select=>select({user:{id:"teacher"}})},"@/components/ui/button":{Button},"@/components/ui/app-feedback":{ErrorState:({message})=>React.createElement("p",{role:"alert"},message),EmptyState:({title})=>React.createElement("p",null,title),ConfirmAction:()=>null},"@/components/ui/content-skeleton":{ContentSkeleton:()=>null},"@/services/exams":{examError:e=>e.message}}}
function audienceMarkup(locale="en"){
 const mocks={...common(locale),"@/services/sections":{},"@tanstack/react-query":{useQuery:({queryKey})=>({data:queryKey[0]==="class-sections"?choices:{total:2,eligible:1,sample:[{roll:"001",name:"Rafi Ahmed"}]}})}};
 const {SectionPicker}=loadComponent("components/classroom/section-picker.tsx",mocks);
 const audience=loadComponent("services/audience.ts",{"@/lib/api":{}});
 let cursor=0;const fake={...React,useId:()=>"audience-label",useEffect(){},useState:initial=>[cursor++===0?true:initial,()=>{}]};
 const {AudienceFields}=loadComponent("components/classroom/audience-fields.tsx",{...mocks,react:fake,"./section-picker":{SectionPicker},"@/services/audience":audience});
 return renderToStaticMarkup(React.createElement(AudienceFields,{classId:"class",value:{mode:"odd",section_ids:[A]},onChange(){}}));
}
function settingsMarkup(kind="preview",locale="en"){
 let cursor=0;
 const preview={rows:[{line:2,name:"Rafi Ahmed",email:"rafi@example.invalid",roll:"001",section:"A",state:"ready"},{line:3,name:"New Student",email:"new@example.invalid",roll:"002",section:"B",state:"not_enrolled"}],ready:1,revision:"snapshot"};
 const slots=kind==="import"?["name,email,roll,section\nRafi Ahmed,rafi@example.invalid,001,A\n","Verified roster",preview,false,"",null]:kind==="preview"?["001",0]:[false,"",null,""];
 const fake={...React,useRef:()=>({current:0}),useState:initial=>[cursor in slots?slots[cursor++]:typeof initial==="function"?initial():initial,()=>{}]};
 const data={student:{name:"Rafi Ahmed",roll:"001",section:"A"},items:[{id:"one",kind:"exam",title:"Section A · Odd-roll exam",visible:true,reason:"Available"},{id:"two",kind:"material",title:"Section B · Lab notes",visible:false,reason:"Not assigned"}],next_offset:-1};
 const mods=loadComponent("components/classroom/section-settings.tsx",{...common(locale),react:fake,"@tanstack/react-query":{useQueryClient:()=>({}),useQuery:({queryKey})=>({data:queryKey[0]==="class-sections"?choices:data})},"@/services/sections":{},"@/components/ui/dialog":{}},"\nexport {ImportRoster,StudentPreview,ManageSections};");
 const component=kind==="import"?mods.ImportRoster:kind==="preview"?mods.StudentPreview:mods.ManageSections;
 return renderToStaticMarkup(React.createElement(component,{classId:"class"}));
}
module.exports={audienceMarkup,settingsMarkup};
