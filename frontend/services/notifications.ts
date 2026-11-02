import {api} from "@/lib/api";
export type Notification={id:string;kind:string;title:string;body:string;url:string;created_at:string;read_at:string|null;email_status:string};
export type NotificationPreferences={app_enabled:boolean;email_enabled:boolean;email_configured:boolean};
export const notifications={
 async list():Promise<{items:Notification[];unread_count:number}>{return (await api.get('/notifications')).data.data;},
 async preferences():Promise<NotificationPreferences>{return (await api.get('/notifications/preferences')).data.data;},
 async savePreferences(p:Pick<NotificationPreferences,'app_enabled'|'email_enabled'>){return (await api.put('/notifications/preferences',p)).data.data;},
 async read(id:string){await api.post(`/notifications/${id}/read`);},
 async readAll(){await api.post('/notifications/read-all');},
};
