import {api} from "@/lib/api";
import {materialService} from "./materials";
import {materialBlob} from "@/lib/offline-resources";
export type ClassworkItem={id:string;kind:"assignment"|"material"|"exam";title:string;description:string;due_at:string|null;created_at:string;status:string;file_name:string;file_size:number;topic_id:string};
export type AnnouncementDraft={id:string;title:string;content:string;state:"draft"|"scheduled"|"published"|"blocked"|"cancelled";publish_at:string|null;version:number;error:string;updated_at:string};
export const classwork={
 async list(id:string,params:Record<string,string|number>,signal?:AbortSignal):Promise<{items:ClassworkItem[];next_offset:number}>{return (await api.get(`/classrooms/${id}/classwork`,{params,signal})).data.data;},
 async duplicate(id:string,item:ClassworkItem){if(item.kind==="material"){const blob=await materialBlob(`/classrooms/${id}/materials/${item.id}/download`,undefined,item.file_name);return materialService.upload(id,{title:item.title.slice(0,190)+" (copy)",description:item.description,file:new File([blob],item.file_name,{type:blob.type})});}return (await api.post(`/classrooms/${id}/coursework/${item.kind}/${item.id}/duplicate`)).data.data;},
 async drafts(id:string):Promise<AnnouncementDraft[]>{return (await api.get(`/classrooms/${id}/announcement-drafts`)).data.data;},
 async saveDraft(id:string,value:Partial<AnnouncementDraft>){return (await api.put(`/classrooms/${id}/announcement-drafts`,value)).data.data;},
 async publishDraft(classId:string,id:string,version:number){await api.post(`/classrooms/${classId}/announcement-drafts/${id}/publish`,{version});},
};
