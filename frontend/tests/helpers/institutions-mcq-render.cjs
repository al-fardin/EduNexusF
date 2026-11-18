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
function mcqMarkup(){
 const styles={field:'min-h-11 min-w-0 w-full rounded-xl border border-border bg-background p-3 text-sm',outline:'inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-3 py-2 text-sm',primary:'min-h-11 rounded-xl bg-primary p-3 text-primary-foreground'};
 const q={id:'q',kind:'mcq',prompt:'Select the prime numbers.',points:5,options:['2','4','3'],selection:'multiple',correct_options:[0,2],shuffle_options:true};
 const fields=loadComponent('components/classroom/mcq-fields.tsx',{'./exam-presentation':styles});
 const states=[true,'paste','text','Select primes\nA. 2\nB. 4\nANSWER: A',[{line:1,question:q,topic:'Logic',difficulty:'easy',errors:[]}],[0],'',false,''];let cursor=0;
 const {QuestionImport}=loadComponent('components/classroom/question-import.tsx',{react:{...React,useState:()=>[states[cursor++],()=>{}]},'@tanstack/react-query':{useQuery:()=>({})},'@/lib/client-id':{},'@/lib/question-import':{},'@/lib/question-import-files':{},'@/services/exams':{},'./exam-presentation':styles});
 return renderToStaticMarkup(React.createElement(fields.MCQFields,{question:q,onChange(){}}))+renderToStaticMarkup(React.createElement(fields.MCQAnswer,{question:q,value:'0,2',attemptId:'attempt',onChange(){}}))+renderToStaticMarkup(React.createElement(QuestionImport,{classroomId:'class',onImport(){}}));
}
module.exports={institutionMarkup,mcqMarkup};
