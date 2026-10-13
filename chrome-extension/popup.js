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
