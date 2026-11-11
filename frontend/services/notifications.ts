import {api} from "@/lib/api";
export type Notification={classroom_id:string;classroom_name:string;group_count:number;unread:boolean;id:string;kind:string;title:string;body:string;url:string;created_at:string;read_at:string|null;email_status:string};
export type NotificationPreferences={app_enabled:boolean;email_enabled:boolean;email_configured:boolean;email_frequency:"immediate"|"daily"|"weekly"};
export const notifications={
 async list(params?:Record<string,string|number|boolean>):Promise<{items:Notification[];classes:{id:string;name:string}[];unread_count:number;next_offset:number}>{return (await api.get('/notifications',{params})).data.data;},
 async preferences():Promise<NotificationPreferences>{return (await api.get('/notifications/preferences')).data.data;},
 async savePreferences(p:Pick<NotificationPreferences,'app_enabled'|'email_enabled'>&Partial<Pick<NotificationPreferences,'email_frequency'>>){return (await api.put('/notifications/preferences',p)).data.data;},
 async read(id:string,group=false){await api.post(`/notifications/${id}/read`,{group});},
 async readAll(){await api.post('/notifications/read-all');},
};
