import type {AxiosProgressEvent} from "axios";
import {api} from "@/lib/api";
export type Assignment={id:string;title:string;instructions:string;due_at:string;max_points:number;allow_late:boolean;allow_resubmit:boolean;status:"draft"|"published"};
export type Submission={id:string;student_id:string;student_name:string;version:number;answer:string;file_name:string;submitted_at:string;late:boolean;awarded_points:number|null;feedback:string;graded_at:string|null};
const path=(classId:string)=>`/classrooms/${classId}/assignments`;
export const assignments={
 async list(c:string):Promise<Assignment[]>{return (await api.get(path(c))).data.data;},
 async save(c:string,a:Partial<Assignment>){return (await api[a.id?"put":"post"](`${path(c)}${a.id?`/${a.id}`:""}`,a)).data.data;},
 async publish(c:string,id:string){await api.post(`${path(c)}/${id}/publish`);},
 async submissions(c:string,id:string):Promise<Submission[]>{return (await api.get(`${path(c)}/${id}/submissions`)).data.data;},
 async submit(c:string,id:string,body:FormData,options?:{signal?:AbortSignal;onUploadProgress?:(e:AxiosProgressEvent)=>void}){return (await api.post(`${path(c)}/${id}/submit`,body,{headers:{"Content-Type":undefined},...options})).data.data;},
 async grade(c:string,a:string,s:string,points:number,feedback:string){await api.put(`${path(c)}/${a}/submissions/${s}/grade`,{points,feedback});},
 async download(c:string,a:string,s:Submission){const res=await api.get(`${path(c)}/${a}/submissions/${s.id}/file`,{responseType:"blob"});const url=URL.createObjectURL(res.data);const link=document.createElement("a");link.href=url;link.download=s.file_name;link.click();URL.revokeObjectURL(url);},
};
