import {api} from "@/lib/api";
export type RubricCriterion={id:string;title:string;maximum:number};
export type GradingTemplate={id:string;kind:"rubric"|"feedback";title:string;payload:{criteria?:RubricCriterion[];text?:string}};
export const gradingTools={
 async list(classId:string,kind:"rubric"|"feedback"):Promise<GradingTemplate[]>{return (await api.get(`/classrooms/${classId}/grading-templates`,{params:{kind}})).data.data;},
 async save(classId:string,value:{kind:"rubric"|"feedback";title:string;criteria?:RubricCriterion[];text?:string}){return (await api.post(`/classrooms/${classId}/grading-templates`,value)).data.data;},
 async remove(classId:string,id:string){await api.delete(`/classrooms/${classId}/grading-templates/${id}`);},
};
