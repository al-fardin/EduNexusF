const React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
const {loadComponent}=require("./classroom-component-render.cjs");
const {translate}=loadComponent("lib/translations.ts",{});
const audience=loadComponent("services/audience.ts",{"@/lib/api":{}});
const utils=loadComponent("lib/utils.ts",{"clsx":require("clsx"),"tailwind-merge":require("tailwind-merge")});
const {Button:wrap}=loadComponent("components/ui/button.tsx",{"@base-ui/react/button":require("@base-ui/react/button"),"class-variance-authority":require("class-variance-authority"),"@/lib/utils":utils});
function audienceHarness(value,locale="en"){
 let changed,options;
 const {AudienceFields}=loadComponent("components/classroom/audience-fields.tsx",{
  "./section-picker":{SectionPicker:()=>null},"@/services/audience":audience,"@/store/auth-store":{useAuthStore:select=>select({user:{id:"teacher"}})},"@/providers/preferences-provider":{usePreferences:()=>({t:text=>translate(locale,text)})},"@tanstack/react-query":{useQuery:input=>{options=input;return {}}},"@/components/ui/button":{Button:wrap},"@/components/ui/app-feedback":{},"@/components/ui/content-skeleton":{},"@/services/exams":{},
 });
 const html=renderToStaticMarkup(React.createElement(AudienceFields,{classId:"class",value,onChange:rule=>changed=rule}));
 return {html,get options(){return options},get changed(){return changed}};
}
module.exports={audienceHarness,loadComponent};
