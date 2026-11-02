import {api} from "@/lib/api";
export type TutorSource={id:string;title:string;kind:"text"|"pdf";material_id:string|null};
export type TutorCitation={id:string;title:string;material_id:string|null;excerpt:string};
export type TutorMessage={id:string;question:string;answer:string;citations:TutorCitation[];created_at?:string};
const path=(id:string)=>`/classrooms/${id}/tutor`;
export const tutor={
 async history(id:string):Promise<{configured:boolean;blocked:boolean;messages:TutorMessage[]}>{return (await api.get(path(id))).data.data;},
 async sources(id:string):Promise<TutorSource[]>{return (await api.get(`${path(id)}/sources`)).data.data;},
 async addSource(id:string,payload:{title?:string;content?:string;material_id?:string}){return (await api.post(`${path(id)}/sources`,payload)).data.data;},
 async removeSource(id:string,sourceId:string){await api.delete(`${path(id)}/sources/${sourceId}`);},
 async ask(id:string,question:string,request_id:string,source_ids:string[]):Promise<Omit<TutorMessage,'question'>>{return (await api.post(`${path(id)}/ask`,{question,request_id,source_ids},{timeout:50000})).data.data;},
};
