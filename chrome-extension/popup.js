async function update() {
  const el=document.querySelector('#status');
  try {
    const r=await chrome.runtime.sendMessage({type:'STATUS'});
    if(!r.ok) throw new Error(r.error||'Unavailable');
    el.textContent=r.connected
      ? `Active exam session · ${r.pending||0} event(s) pending delivery`
      : 'Extension installed · no consented exam session active';
    const ai=document.querySelector('#ai-status');
    if (!r.connected) ai.textContent='AI capture is inactive until exam consent.';
    else if (r.aiDiagnostic?.lastScriptReadyAt) {
      const site=r.aiDiagnostic.lastScriptDomain||'AI site';
      ai.textContent=`AI detector ready on ${site} · ${r.aiDiagnostic.promptCount||0} prompt(s) captured in this exam.` +
        (r.aiDiagnostic.lastInjectionError?` Injection warning: ${r.aiDiagnostic.lastInjectionError}`:'');
    } else {
      ai.textContent='AI detector not verified yet. Open ChatGPT/Claude/Gemini in this browser, allow site access, and refresh that tab.' +
        (r.aiDiagnostic?.lastInjectionError?` (${r.aiDiagnostic.lastInjectionError})`:'');
    }
  } catch {el.textContent='Extension connection error. Reload the extension.';}
}
document.querySelector('#stop').onclick=async()=>{
  if(!confirm('Stop monitoring? Events not yet delivered may be lost. The teacher will see a coverage gap.'))return;
  await chrome.runtime.sendMessage({type:'STOP'});
  await update();
};
void update();
// Grant access only after a user chooses their EduNexus site in the popup.
document.querySelector('#connect-site').onclick = async () => {
  const status = document.querySelector('#site-status');
  try {
    const [tab] = await chrome.tabs.query({active:true,currentWindow:true});
    const url = new URL(tab?.url || '');
    if (!['http:','https:'].includes(url.protocol) || !tab?.id)
      throw Error('Open your EduNexus exam website first.');
    const pattern = `${url.protocol}//${url.hostname}/*`;
    if (!await chrome.permissions.request({origins:[pattern]})) throw Error('Site access was not granted.');
    const key = 'edunexus_allowed_origins';
    const origins = (await chrome.storage.local.get(key))[key] || [];
    await chrome.storage.local.set({[key]:[...new Set([...origins,url.origin])].slice(-30)});
    const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(pattern));
    const id = 'edunexus-site-' + Array.from(new Uint8Array(digest)).slice(0,12).map(x=>x.toString(16).padStart(2,'0')).join('');
    await chrome.scripting.unregisterContentScripts({ids:[id]}).catch(()=>{});
    await chrome.scripting.registerContentScripts([{id,matches:[pattern],js:['content.js'],runAt:'document_idle',persistAcrossSessions:true}]);
    await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});
    status.textContent = `Connected to ${url.origin}. Return to the exam.`;
  } catch (error) {
    status.textContent = error.message || 'Unable to connect this site.';
  }
};
