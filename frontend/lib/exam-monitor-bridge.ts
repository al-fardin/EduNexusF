import type {BrowserMonitorEvent} from "@/services/exam-monitor";

export type MonitorBridgeType = "START" | "STOP" | "PEEK" | "ACK" | "STATUS";
export type MonitorBridgeReply = {
  ok: boolean;
  connected?: boolean;
  sessionKey?: string | null;
  version?: string;
  error?: string;
  events?: BrowserMonitorEvent[];
};

const WEB = "EDUNEXUS_MONITOR_WEB_V1";
const EXT = "EDUNEXUS_MONITOR_EXT_V1";

// A local browser-extension connectivity probe, not an anti-tampering attestation.
export function monitorBridge(type: MonitorBridgeType, payload: Record<string,unknown> = {}): Promise<MonitorBridgeReply> {
  return new Promise(resolve => {
    if (typeof window === "undefined") return resolve({ok:false,error:"Browser required"});
    const requestId = window.crypto.randomUUID();
    let finished = false;
    const finish = (value:MonitorBridgeReply) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      resolve(value);
    };
    const onMessage = (event:MessageEvent) => {
      if(event.source!==window || event.origin!==window.location.origin ||
        event.data?.source!==EXT || event.data?.requestId!==requestId || event.data?.type!==type) return;
      finish(event.data.response??{ok:false,error:"Empty extension response"});
    };
    const timeout = window.setTimeout(() => finish({ok:false,error:"Extension did not reply. Check its localhost site access and reload the exam."}), 5000);
    window.addEventListener("message",onMessage);
    window.postMessage({source:WEB,type,payload,requestId},window.location.origin);
  });
}

export function approvedExamKey(classroomId:string,examId:string) {
  return `edunexus:monitor:admitted:${classroomId}:${examId}`;
}
