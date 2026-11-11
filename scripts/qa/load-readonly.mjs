// Native Node HTTP load probe. GET only; secrets stay in environment variables.
// EDUNEXUS_LOAD_URL, EDUNEXUS_LOAD_TOKEN, EDUNEXUS_LOAD_PATHS (JSON string array).
import {performance} from "node:perf_hooks";
import {writeFile} from "node:fs/promises";
const base=new URL(process.env.EDUNEXUS_LOAD_URL??"http://127.0.0.1:8087");
if(!["127.0.0.1","localhost","[::1]"].includes(base.hostname)&&process.env.EDUNEXUS_ALLOW_REMOTE_LOAD!=="yes")throw new Error("Remote load tests require EDUNEXUS_ALLOW_REMOTE_LOAD=yes");
const concurrency=Number(process.env.EDUNEXUS_LOAD_CONCURRENCY??10),total=Number(process.env.EDUNEXUS_LOAD_REQUESTS??100);
if(!Number.isInteger(concurrency)||concurrency<1||concurrency>50||!Number.isInteger(total)||total<1||total>10000)throw new Error("Use 1–50 workers and 1–10000 requests");
const paths=JSON.parse(process.env.EDUNEXUS_LOAD_PATHS??'["/health/ready"]');if(!Array.isArray(paths)||!paths.length||paths.some(p=>typeof p!=="string"||!p.startsWith("/")||new URL(p,base).origin!==base.origin))throw new Error("Provide GET paths on the same origin");
const latency=[],statuses={};let next=0;const started=performance.now();
await Promise.all(Array.from({length:concurrency},async()=>{while(next<total){const index=next++,start=performance.now();let status="network_error";try{const response=await fetch(new URL(paths[index%paths.length],base),{headers:process.env.EDUNEXUS_LOAD_TOKEN?{Authorization:`Bearer ${process.env.EDUNEXUS_LOAD_TOKEN}`}:{},signal:AbortSignal.timeout(15000),redirect:"error"});await response.arrayBuffer();status=String(response.status);}catch{}statuses[status]=(statuses[status]??0)+1;latency.push(performance.now()-start);}}));
latency.sort((a,b)=>a-b);const percentile=p=>Math.round(latency[Math.min(latency.length-1,Math.ceil(latency.length*p)-1)]);const result={requests:total,concurrency,statuses,p50_ms:percentile(.5),p95_ms:percentile(.95),p99_ms:percentile(.99),elapsed_ms:Math.round(performance.now()-started)};console.log(JSON.stringify(result,null,2));if(process.env.EDUNEXUS_LOAD_REPORT)await writeFile(process.env.EDUNEXUS_LOAD_REPORT,JSON.stringify(result,null,2));if(Object.keys(statuses).some(s=>!s.startsWith("2"))||result.p95_ms>Number(process.env.EDUNEXUS_LOAD_P95_MS??2000))process.exitCode=1;
