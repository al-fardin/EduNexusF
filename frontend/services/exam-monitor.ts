import { api } from "@/lib/api";
type Envelope<T> = { success: boolean; data: T };
const base = (classId:string,examId:string) => `/classrooms/${classId}/exams/${examId}`;
export type MonitorPolicy = {enabled:boolean;flag_after_exits:number;editable:boolean};
export type BrowserMonitorEvent = {id:string;kind:string;source:"extension"|"page";domain?:string;text?:string;duration_seconds?:number;at?:string};
export type MonitorStudent = {attempt_id:string;roll:string;student_name:string;status:string;heartbeat_current:boolean;extension_connected:boolean;exits:number;interruptions:number;red_flag_events:number};
export type MonitorLive = {enabled:boolean;flag_after_exits:number;students:MonitorStudent[]};
export type MonitorReport = {summary:{exits:number;external_sites:number;interruptions:number;searches:number;ai_prompts:number;exam_pastes:number;external_copies:number;consented:boolean;extension_connected:boolean;heartbeat_current:boolean;red_flag_events:number;last_seen:string|null};flags:string[];events:{kind:string;source:string;domain:string;text:string;duration_seconds:number;recorded_at:string}[];notice:string};
export const examMonitor = {
  async policy(cid:string,eid:string) { const r=await api.get<Envelope<MonitorPolicy>>(`${base(cid,eid)}/monitor-policy`);return r.data.data; },
  async setPolicy(cid:string,eid:string,enabled:boolean,flag_after_exits:number) {const r=await api.put<Envelope<MonitorPolicy>>(`${base(cid,eid)}/monitor-policy`,{enabled,flag_after_exits});return r.data.data;},
  async admit(cid:string,eid:string,extension_ready:boolean) { await api.post(`${base(cid,eid)}/monitor-admission`,{consented:true,extension_ready}); },
  async heartbeat(cid:string,eid:string,extension_connected:boolean){await api.post(`${base(cid,eid)}/monitor-heartbeat`,{consented:true,extension_connected});},
  async events(cid:string,eid:string,events:BrowserMonitorEvent[]){await api.post(`${base(cid,eid)}/monitor-events`,{events});},
  async live(cid:string,eid:string){const r=await api.get<Envelope<MonitorLive>>(`${base(cid,eid)}/monitor-live`);return r.data.data;},
  async report(cid:string,eid:string,attempt:string){const r=await api.get<Envelope<MonitorReport>>(`${base(cid,eid)}/monitor-report/${attempt}`);return r.data.data;},
};
