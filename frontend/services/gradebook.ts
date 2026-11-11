import {api} from "@/lib/api";
export type GradeColumn={id:string;kind:"assignment"|"exam";title:string;maximum:number;due_at:string};
export type GradeCell={score:number|null;status:"graded"|"needs_grading"|"pending"|"missing"|"in_progress";published:boolean;version:number;late:boolean};
export type GradeStudent={id:string;name:string;roll:string;missing:number;needs_grading:number;cells:Record<string,GradeCell>};
export type GradebookData={columns:GradeColumn[];students:GradeStudent[];generated_at:string};
export async function getGradebook(classId:string):Promise<GradebookData>{return (await api.get(`/classrooms/${classId}/gradebook`)).data.data;}
