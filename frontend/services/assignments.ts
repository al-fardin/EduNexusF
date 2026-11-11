import type {RubricCriterion} from "./grading-tools";
import type {AxiosProgressEvent} from "axios";
import {api} from "@/lib/api";
import {cachedResource} from "@/lib/offline-resources";
export type Assignment={rubric?:RubricCriterion[];reason?:string;id:string;title:string;instructions:string;due_at:string;max_points:number;allow_late:boolean;allow_resubmit:boolean;status:"draft"|"published"};
export type Submission={rubric_scores?:Record<string,number>;id:string;student_id:string;student_name:string;version:number;answer:string;file_name:string;submitted_at:string;late:boolean;awarded_points:number|null;feedback:string;graded_at:string|null};
const path=(classId:string)=>`/classrooms/${classId}/assignments`;
export const assignments={
 async list(c:string):Promise<Assignment[]>{return cachedResource(c,"assignments",async()=>(await api.get(path(c))).data.data);},
 async save(c:string,a:Partial<Assignment>){return (await api[a.id?"put":"post"](`${path(c)}${a.id?`/${a.id}`:""}`,a)).data.data;},
 async deadline(c:string,id:string,due_at:string,expected_due_at:string,reason:string){await api.patch(`${path(c)}/${id}/deadline`,{due_at,expected_due_at,reason});},
 async publish(c:string,id:string){await api.post(`${path(c)}/${id}/publish`);},
 async submissions(c:string,id:string,offline=false):Promise<Submission[]>{const fetcher=async()=>(await api.get(`${path(c)}/${id}/submissions`)).data.data;return offline?cachedResource(c,"submissions-"+id,fetcher):fetcher();},
 async submit(c:string,id:string,body:FormData,options?:{signal?:AbortSignal;onUploadProgress?:(e:AxiosProgressEvent)=>void}){return (await api.post(`${path(c)}/${id}/submit`,body,{headers:{"Content-Type":undefined},...options})).data.data;},
 async grade(c:string,a:string,s:string,points:number,feedback:string,reason="",criteria?:Record<string,number>){await api.put(`${path(c)}/${a}/submissions/${s}/grade`,{points,feedback,reason,criteria});},
 async download(c:string,a:string,s:Submission){const res=await api.get(`${path(c)}/${a}/submissions/${s.id}/file`,{responseType:"blob"});const url=URL.createObjectURL(res.data);const link=document.createElement("a");link.href=url;link.download=s.file_name;link.click();URL.revokeObjectURL(url);},
};
