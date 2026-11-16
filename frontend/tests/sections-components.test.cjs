const test=require("node:test"),assert=require("node:assert/strict"),React=require("react"),{renderToStaticMarkup}=require("react-dom/server");
const {loadComponent}=require("./helpers/classroom-component-render.cjs");
const {translate}=loadComponent("lib/translations.ts",{});
const A="11111111-1111-4111-8111-111111111111",B="22222222-2222-4222-8222-222222222222";
function find(node,predicate){if(!node||typeof node!=="object")return;if(predicate(node))return node;for(const child of React.Children.toArray(node.props?.children)){const found=find(child,predicate);if(found)return found;}}
const prefs={usePreferences:()=>({t:s=>s})};
test("section picker is optional and changes only explicitly selected sections",()=>{
 let selected,options;const {SectionPicker}=loadComponent("components/classroom/section-picker.tsx",{"@tanstack/react-query":{useQuery:o=>{options=o;return {data:[{id:A,name:"A"},{id:B,name:"B"}]}}},"@/services/sections":{},"@/store/auth-store":{useAuthStore:select=>select({user:{id:"teacher"}})},"@/providers/preferences-provider":prefs,"@/components/ui/content-skeleton":{},"@/components/ui/app-feedback":{},"@/services/exams":{}});
 assert.equal(SectionPicker({classId:"class",value:[],onChange(){},enabled:false}),null);assert.equal(options.enabled,false);
 const tree=SectionPicker({classId:"class",value:[A],onChange:value=>selected=value});find(tree,n=>n.type==="input"&&n.props.checked).props.onChange({target:{checked:false}});assert.deepEqual(selected,[]);assert.match(renderToStaticMarkup(tree),/No section selected means the whole class/);
});
test("audience combines section selection with odd rolls and resets Everyone explicitly",()=>{
 let selected;const values=[];const audience=loadComponent("services/audience.ts",{"@/lib/api":{}});
 const {AudienceFields}=loadComponent("components/classroom/audience-fields.tsx",{react:{...React,useState:initial=>[typeof initial==="function"?initial():initial,()=>{}],useEffect(){},useId:()=>"label"},"./section-picker":{SectionPicker:()=>null},"@tanstack/react-query":{useQuery:()=>({})},"@/services/audience":audience,"@/store/auth-store":{useAuthStore:select=>select({user:{id:"teacher"}})},"@/providers/preferences-provider":prefs,"@/components/ui/button":{},"@/components/ui/app-feedback":{},"@/components/ui/content-skeleton":{},"@/services/exams":{}});
 const tree=AudienceFields({classId:"class",value:{mode:"sections",section_ids:[A]},onChange:r=>{selected=r;values.push(r)}});const select=find(tree,n=>n.type==="select");select.props.onChange({target:{value:"odd"}});assert.equal(selected.mode,"odd");assert.deepEqual(Array.from(selected.section_ids),[A]);select.props.onChange({target:{value:"all"}});assert.equal(selected.mode,"all");assert.equal(selected.section_ids,undefined);
});
test("roster CSV sends a confirmed revision and reason, never enrolling a student",async()=>{
 let cursor=0;const rows=["name,email,roll,section\nTest User,test@example.com,001,A\n","Section reconciliation",null,false,"",null],calls=[];
 const fakeReact={...React,useRef:()=>({current:0}),useState(initial){const i=cursor++;if(!(i in rows))rows[i]=typeof initial==="function"?initial():initial;return [rows[i],next=>rows[i]=typeof next==="function"?next(rows[i]):next]}};
 const mocks={react:fakeReact,"@tanstack/react-query":{useQueryClient:()=>({invalidateQueries:async()=>{}})},"@/services/sections":{sections:{async import(...args){calls.push(args);return {rows:[{line:2,name:"Test User",email:"test@example.com",roll:"001",section:"A",state:"ready"}],ready:1,revision:"snapshot",changed:1}}}},"@/store/auth-store":{},"@/providers/preferences-provider":prefs,"@/components/ui/button":{},"@/components/ui/dialog":{},"@/components/ui/app-feedback":{},"@/components/ui/content-skeleton":{},"@/services/exams":{examError:e=>e.message}};
 const {ImportRoster}=loadComponent("components/classroom/section-settings.tsx",mocks,"\nexport {ImportRoster};");function render(){cursor=0;return ImportRoster({classId:"class"})}
 let tree=render();find(tree,n=>n.props?.children==="Preview roster changes").props.onClick();await new Promise(setImmediate);assert.equal(calls[0][2],"preview");assert.equal(calls.length,1);tree=render();find(tree,n=>Array.isArray(n.props?.children)&&n.props.children.includes("Confirm roster changes")).props.onClick();await new Promise(setImmediate);assert.equal(calls[1][2],"commit");assert.equal(calls[1][3],"snapshot");assert.equal(calls[1][4],"Section reconciliation");assert.equal(rows[0],"");assert.equal(rows[5],1);
});
test("section labels have Bengali translations without changing student names",()=>{assert.equal(translate("bn","Sections"),"সেকশন");assert.equal(translate("bn","Student-view preview"),"শিক্ষার্থীর ভিউ প্রিভিউ");assert.equal(translate("bn","Rafi Ahmed"),"Rafi Ahmed")});
