const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const {loadComponent}=require('./classroom-component-render.cjs');
const {translate}=loadComponent('lib/translations.ts',{});
const utils=loadComponent('lib/utils.ts',{'clsx':require('clsx'),'tailwind-merge':require('tailwind-merge')});
const {Button}=loadComponent('components/ui/button.tsx',{'@base-ui/react/button':require('@base-ui/react/button'),'class-variance-authority':require('class-variance-authority'),'@/lib/utils':utils});
function institutionMarkup(locale='en'){
 const org={id:'org',name:'EduNexus · Department of Computer Science',role:'owner',version:1,departments:[{id:'dept',name:'Computer Science',version:1}],terms:[{id:'term',name:'Autumn semester 2026',starts_on:'2026-08-01',ends_on:'2026-12-31',version:1}]};
 const mocks={'@/services/institutions':{},'@/store/auth-store':{useAuthStore:fn=>fn({user:{id:'owner'}})},'@/providers/preferences-provider':{usePreferences:()=>({t:s=>translate(locale,s),locale:locale==='bn'?'bn-BD':'en-US'})},'@/components/ui/button':{Button},'@/components/ui/content-skeleton':{ContentSkeleton:()=>null},'@/components/ui/app-feedback':{EmptyState:()=>null,ErrorState:()=>null,ConfirmAction:()=>null},'@/services/exams':{examError:String},'@tanstack/react-query':{useQueryClient:()=>({}),useInfiniteQuery:({queryKey})=>({data:{pages:[{items:queryKey[0]==='institution-choices'?[org]:[]}]}}),useQuery:()=>({data:org})},react:{...React,useState:initial=>[typeof initial==='boolean'?true:initial,()=>{}]}};
 const {InstitutionPlacementFields}=loadComponent('components/institutions/placement-fields.tsx',mocks);
 const {InstitutionSettings}=loadComponent('components/institutions/settings.tsx',mocks);
 return renderToStaticMarkup(React.createElement(InstitutionPlacementFields,{value:{institution_id:'org',department_id:'dept',term_id:'term'},onChange(){}}))+renderToStaticMarkup(React.createElement(InstitutionSettings,{org}));
}
function mcqMarkup(){return require('./question-tools-render.cjs').questionToolsMarkup();}
module.exports={institutionMarkup,mcqMarkup};
