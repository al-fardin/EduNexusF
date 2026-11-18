const test=require('node:test'),assert=require('node:assert/strict'),React=require('react');
const {loadComponent}=require('./helpers/classroom-component-render.cjs');
function nodes(tree,predicate){const found=[];function visit(n){if(!n||typeof n!=='object')return;if(predicate(n))found.push(n);React.Children.forEach(n.props?.children,visit)}visit(tree);return found;}
const base={'@/services/institutions':{},'@/store/auth-store':{useAuthStore:fn=>fn({user:{id:'teacher'}})},'@/providers/preferences-provider':{usePreferences:()=>({t:s=>s})},'@/components/ui/button':{},'@/components/ui/content-skeleton':{},'@/components/ui/app-feedback':{},'@/services/exams':{}};
test('institution placement stays optional and makes no query until opened',()=>{
 const queries=[];let changed;
 const {InstitutionPlacementFields}=loadComponent('components/institutions/placement-fields.tsx',{...base,react:{...React,useState:()=>[false,()=>{}]},'@tanstack/react-query':{useInfiniteQuery:opts=>(queries.push(opts),{}),useQuery:opts=>(queries.push(opts),{})}});
 const tree=InstitutionPlacementFields({value:null,onChange:v=>changed=v});assert.equal(queries.length,2);assert.ok(queries.every(q=>q.enabled===false));assert.equal(nodes(tree,n=>n.props?.required).length,0);
 nodes(tree,n=>n.type==='select')[0].props.onChange({target:{value:'org'}});assert.deepEqual(JSON.parse(JSON.stringify(changed)),{institution_id:'org',department_id:'',term_id:''});
 nodes(tree,n=>n.type==='select')[0].props.onChange({target:{value:''}});assert.equal(changed,null);
});
test('changing institution clears the prior department and semester',()=>{
 let changed;
 const {InstitutionPlacementFields}=loadComponent('components/institutions/placement-fields.tsx',{...base,react:{...React,useState:()=>[true,()=>{}]},'@tanstack/react-query':{useInfiniteQuery:()=>({data:{pages:[{items:[{id:'new',name:'New institution'}]}]}}),useQuery:()=>({data:{departments:[],terms:[]}})}});
 const tree=InstitutionPlacementFields({value:{institution_id:'old',department_id:'old-department',term_id:'old-term'},onChange:v=>changed=v});
 nodes(tree,n=>n.type==='select')[0].props.onChange({target:{value:'new'}});assert.deepEqual(JSON.parse(JSON.stringify(changed)),{institution_id:'new',department_id:'',term_id:''});
});
