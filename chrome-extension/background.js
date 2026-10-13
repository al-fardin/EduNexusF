// EduNexus V13: explicit exam-scoped website, search, AI prompt, selection-copy and exam-paste evidence.
// No old chat history, desktop apps, passwords or browsing outside active sessions.
const SESSION_KEY = 'edunexus_exam_session_v1';
const QUEUE_KEY = 'edunexus_exam_events_v1';
const AI_DIAG_KEY = 'edunexus_ai_diag_v13_2';
const aiPatterns = ['https://chatgpt.com/*','https://chat.openai.com/*','https://claude.ai/*','https://gemini.google.com/*'];
let busy = Promise.resolve();
const locked = (fn) => { const next = busy.then(fn, fn); busy = next.catch(() => {}); return next; };
const now = () => Date.now();
const iso = () => new Date().toISOString();
const eventId = () => crypto.randomUUID();
const clipped = value => String(value||'').slice(0,2000);
const aiDomains = new Set(['chatgpt.com','chat.openai.com','claude.ai','gemini.google.com']);
const searchParams = {'google.com':'q','www.google.com':'q','www.google.com.bd':'q','bing.com':'q','www.bing.com':'q',
 'duckduckgo.com':'q','www.duckduckgo.com':'q','search.yahoo.com':'p','search.brave.com':'q','www.ecosia.org':'q'};
let recentText = new Map();
let recentExamPaste = { sessionKey: '', text: '', at: 0 }; // Ignore duplicate listeners, not genuine later pastes.

function searchDetails(raw) {
 try {
   const u=new URL(raw||'');
   if(!['https:','http:'].includes(u.protocol))return null;
   const host=u.hostname.toLowerCase();
   const key=searchParams[host] || (/^(www\.)?google\.[a-z.]+$/.test(host)?'q':null);
   if(!key) return null;
   const query=clipped(u.searchParams.get(key));
   return query.trim()?{domain:host,text:query}:null;
 } catch {return null;}
}

async function state() {
  const s = await chrome.storage.local.get([SESSION_KEY, QUEUE_KEY]);
  return {session:s[SESSION_KEY] || null, events:Array.isArray(s[QUEUE_KEY]) ? s[QUEUE_KEY] : []};
}
async function clearSession() {await chrome.storage.local.remove([SESSION_KEY]);}
async function diagnostic(patch) {
  const stored = await chrome.storage.local.get([AI_DIAG_KEY]);
  await chrome.storage.local.set({[AI_DIAG_KEY]: {...(stored[AI_DIAG_KEY]||{}), ...patch}});
}
// Refreshes the AI content script in tabs opened before an extension upgrade.
async function ensureAiScript(tabId, domain) {
  if (!aiDomains.has(domain) || !chrome.scripting?.executeScript) return;
  try {
    const ready = await chrome.tabs.sendMessage(tabId, {type:'AI_MONITOR_PING'}).catch(()=>null);
    if (ready?.version==='1.3.2') return;
    await chrome.scripting.executeScript({target:{tabId}, files:['ai-evidence.js']});
  } catch (e) {
    await diagnostic({lastInjectionError:String(e).slice(0,300),lastInjectionDomain:domain});
  }
}
async function activateExistingAiTabs() {
  try {
    const tabs = await chrome.tabs.query({url:aiPatterns});
    for (const tab of tabs) if (tab.id) await ensureAiScript(tab.id,domainFromURL(tab.url));
  } catch(e) { await diagnostic({lastInjectionError:String(e).slice(0,300)}); }
}
async function activeSession() {
  const s = (await state()).session;
  if (!s) return null;
  if (now() >= s.expiresAt) { await chrome.storage.local.remove([SESSION_KEY, QUEUE_KEY]); return null; }
  return s;
}
function domainFromURL(raw) {
  try {
    const u = new URL(raw || '');
    if (!['https:','http:'].includes(u.protocol)) return '';
    return u.hostname.toLowerCase().slice(0,253);
  } catch {return '';}
}
async function append(kind, extras={}) {
  const s=await activeSession(); if (!s) return;
  const before = await state();
  const event={id:eventId(),kind,source:'extension',at:iso(),duration_seconds:0,...extras};
  // Queue only explicitly permitted, truncated evidence while session is active.
  await chrome.storage.local.set({[QUEUE_KEY]:[...before.events,event].slice(-450)});
}
async function markAway() {
  const s=await activeSession();
  if(s && !s.awaySince) await chrome.storage.local.set({[SESSION_KEY]:{...s,awaySince:now()}});
}
async function markReturn() {
  const s=await activeSession();
  if(s && s.awaySince){
    const duration=Math.min(86400,Math.max(0,Math.floor((now()-s.awaySince)/1000)));
    await append('exam_tab_returned',{duration_seconds:duration});
    await chrome.storage.local.set({[SESSION_KEY]:{...s,awaySince:null}});
  }
}
async function registerExternalTab(tabId, switched=true) {
  const s=await activeSession();if (!s) return;
  if(tabId===s.examTabId) {await markReturn(); return;}
  await markAway();
  try {
    const t=await chrome.tabs.get(tabId);
    if (!t.active) return;
    const domain=domainFromURL(t.url);
    await ensureAiScript(tabId,domain);
    if(switched) await append('tab_switched');
    if (domain && domain!==s.examDomain) await append('site_active',{domain});
    const search=searchDetails(t.url);
    if(search) {
      const signature='search:'+search.domain+':'+search.text;
      if(recentText.get(s.sessionKey)?.signature!==signature || now()-recentText.get(s.sessionKey)?.at>2000){recentText.set(s.sessionKey,{signature,at:now()});await append('search_query',search);}
    }
  } catch {await append('tab_switched');}
}
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  locked(async()=>{
    const s=await activeSession();
    const type=message?.type;
    if (type==='START') {
      const expiresAt=Number(message.payload?.expiresAt);
      const sessionKey=String(message.payload?.sessionKey||'').slice(0,120);
      if (!Number.isFinite(expiresAt) || expiresAt<=now() || expiresAt>now()+5*60*60*1000 || !sessionKey || !sender.tab?.id) return {ok:false,error:'Invalid exam session'};
      if (s && s.sessionKey!==sessionKey) return {ok:false,error:'Another exam is being monitored; stop it first'};
      const previousAway=s?.awaySince;
      const newSession={sessionKey,expiresAt,examTabId:sender.tab.id,examWindowId:sender.tab.windowId,examDomain:domainFromURL(sender.tab.url),consentedAt:s?.consentedAt||iso(),awaySince:null};
      await chrome.storage.local.set({[SESSION_KEY]:newSession});
      if (!s) {await chrome.storage.local.set({[QUEUE_KEY]:[],[AI_DIAG_KEY]:{promptCount:0,startedAt:iso()}});recentText.clear();recentExamPaste={sessionKey:'',text:'',at:0};}
      await activateExistingAiTabs();
      if(previousAway) await append('exam_tab_returned',{duration_seconds:Math.min(86400,Math.max(0,Math.floor((now()-previousAway)/1000)))});
      await append('extension_started');
      chrome.alarms.create('edunexus_expire',{periodInMinutes:1});
      return {ok:true,connected:true};
    }
    if (type==='STATUS') return {ok:true,connected:!!s,version:'1.3.2',sessionKey:s?.sessionKey||null,expiresAt:s?.expiresAt||null,pending:(await state()).events.length,aiDiagnostic:(await chrome.storage.local.get([AI_DIAG_KEY]))[AI_DIAG_KEY]||null};
    if (type==='AI_MONITOR_READY') {
      if(!s || !sender.tab?.id)return {ok:false};
      const domain=domainFromURL(sender.tab.url);
      if(!aiDomains.has(domain))return {ok:false};
      await diagnostic({lastScriptReadyAt:iso(),lastScriptDomain:domain,lastInjectionError:null});
      return {ok:true};
    }
    // External content-script messages are accepted only from approved live AI websites.
    if (type==='EXTERNAL_EVIDENCE') {
      if(!s || !sender.tab?.id || !sender.tab?.url) return {ok:false};
      const domain=domainFromURL(sender.tab.url);
      if(!aiDomains.has(domain))return {ok:false};
      const kind=String(message.kind||'');
      const value=clipped(message.text);
      if(!['ai_prompt','external_copy'].includes(kind)||!value.trim())return {ok:false};
      const sentAt=Number(message.sentAt);
      if(!Number.isFinite(sentAt) || Math.abs(now()-sentAt)>30000)return {ok:false};
      const sig=kind+':'+domain+':'+value;
      if(recentText.get(s.sessionKey+':ai')?.signature===sig && now()-recentText.get(s.sessionKey+':ai')?.at<2000)return {ok:true};
      recentText.set(s.sessionKey+':ai',{signature:sig,at:now()});
      await append(kind,{domain,text:value});
      if(kind==='ai_prompt'){
        const diag=(await chrome.storage.local.get([AI_DIAG_KEY]))[AI_DIAG_KEY]||{};
        await diagnostic({lastPromptAt:iso(),lastPromptDomain:domain,promptCount:(diag.promptCount||0)+1});
      }
      return {ok:true};
    }
    if (type==='EXAM_PASTE') {
      if(!s || sender.tab?.id!==s.examTabId)return {ok:false};
      const value=clipped(message.text);
      if(!value.trim())return {ok:false};
      if (recentExamPaste.sessionKey===s.sessionKey && recentExamPaste.text===value && now()-recentExamPaste.at<1200) return {ok:true,duplicate:true};
      recentExamPaste={sessionKey:s.sessionKey,text:value,at:now()};
      await append('exam_paste',{text:value});
      return {ok:true};
    }
    if (type==='STOP') {
      if (s) await append('extension_stopped');
      await chrome.storage.local.remove([SESSION_KEY,QUEUE_KEY,AI_DIAG_KEY]);recentText.clear();
      return {ok:true};
    }
    if (type==='PEEK') return {ok:true,connected:!!s,events:(await state()).events.slice(0,25)};
    if (type==='ACK') {
      const ids=Array.isArray(message.payload?.ids)?message.payload.ids.slice(0,25):[];
      const set=new Set(ids.filter(v=>typeof v==='string'));
      const events=(await state()).events.filter(ev=>!set.has(ev.id));
      await chrome.storage.local.set({[QUEUE_KEY]:events});
      return {ok:true};
    }
    return {ok:false,error:'Unknown request'};
  }).then(sendResponse,e=>sendResponse({ok:false,error:String(e)}));
  return true;
});
chrome.tabs.onActivated.addListener(info => {void locked(()=>registerExternalTab(info.tabId));});
chrome.tabs.onUpdated.addListener((tabId,change,tab)=>{
  if (!change.url || !tab.active) return;
  void locked(()=>registerExternalTab(tabId,false));
});
chrome.tabs.onRemoved.addListener(tabId=>{
  void locked(async()=>{
    const s=await activeSession();if(s && tabId===s.examTabId) {await markAway();await append('exam_tab_closed');}
  });
});
chrome.windows.onFocusChanged.addListener(windowId=>{
  void locked(async()=>{
    const s=await activeSession();if(!s)return;
    if (windowId===chrome.windows.WINDOW_ID_NONE) {await markAway();await append('window_blur');return;}
    if (windowId!==s.examWindowId) {await markAway();await append('window_blur');return;}
    await append('window_focus');
    try { const tabs=await chrome.tabs.query({active:true,windowId}); if (tabs.length && tabs[0].id!==s.examTabId) await registerExternalTab(tabs[0].id); else if (tabs.length) await markReturn(); }
    catch {}
  });
});
chrome.windows.onBoundsChanged?.addListener(win=>{
  void locked(async()=>{
    const s=await activeSession();if(s && win.id===s.examWindowId && win.state==='minimized') {await markAway();await append('window_minimized');}
  });
});
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='edunexus_expire')void locked(activeSession);});
