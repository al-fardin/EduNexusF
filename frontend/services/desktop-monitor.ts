import {api} from "@/lib/api";

type Envelope<T> = {success:boolean;data:T};
const endpoint=(classroomId:string,examId:string)=>`/classrooms/${classroomId}/exams/${examId}`;
export type DesktopStatus={connected:boolean;platform?:string;last_seen?:string|null};
export type DesktopEvent={kind:string;app_name:string;recorded_at:string};
export type DesktopReport={platform:string;connected:boolean;last_seen:string|null;events:DesktopEvent[];notice:string};
export const desktopMonitor={
  async preflightPair(classroomId:string,examId:string){
    const r=await api.post<Envelope<{pair_code:string;expires_in_seconds:number}>>(`${endpoint(classroomId,examId)}/desktop-preflight-pair`);
    return r.data.data;
  },
  async preflightStatus(classroomId:string,examId:string){
    const r=await api.get<Envelope<DesktopStatus>>(`${endpoint(classroomId,examId)}/desktop-preflight-status`);
    return r.data.data;
  },
  async pair(classroomId:string,examId:string){
    const r=await api.post<Envelope<{pair_code:string;expires_in_seconds:number}>>(`${endpoint(classroomId,examId)}/desktop-pair`);
    return r.data.data;
  },
  async status(classroomId:string,examId:string){
    const r=await api.get<Envelope<DesktopStatus>>(`${endpoint(classroomId,examId)}/desktop-status`);
    return r.data.data;
  },
  async report(classroomId:string,examId:string,attemptId:string){
    const r=await api.get<Envelope<DesktopReport>>(`${endpoint(classroomId,examId)}/desktop-report/${attemptId}`);
    return r.data.data;
  },
};
