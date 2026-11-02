import { api } from "@/lib/api";
import type { ExamQuestion } from "@/services/exams";
export type BankItem={id:string;question:ExamQuestion;topic:string;difficulty:string;version:number;updated_at:string};
export type BankInput={question:ExamQuestion;topic:string;difficulty:string;version?:number};
export const questionBank={
 async list(classId:string,topic="",difficulty=""):Promise<BankItem[]>{return (await api.get(`/classrooms/${classId}/question-bank`,{params:{topic,difficulty}})).data.data;},
 async save(classId:string,items:BankInput|BankInput[],id?:string){return (await api[id?"put":"post"](`/classrooms/${classId}/question-bank${id?`/${id}`:""}`,items)).data.data;},
 async remove(classId:string,id:string){await api.delete(`/classrooms/${classId}/question-bank/${id}`);},
 async draw(classId:string,count:number,topic:string,difficulty:string):Promise<BankItem[]>{return (await api.post(`/classrooms/${classId}/question-bank/draw`,{}, {params:{count,topic,difficulty}})).data.data;},
};
