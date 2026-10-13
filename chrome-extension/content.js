// Only injected into EduNexus localhost origins, never into arbitrary websites.
// Transport bridge: no JWT, passwords or exam answer content enters the extension.
(() => {
  if (window.__EDUNEXUS_MONITOR_BRIDGE_INSTALLED__) return;
  window.__EDUNEXUS_MONITOR_BRIDGE_INSTALLED__ = true;
  const WEB = 'EDUNEXUS_MONITOR_WEB_V1';
  const EXT = 'EDUNEXUS_MONITOR_EXT_V1';
  window.addEventListener('message', async (event) => {
    if (event.source !== window || event.origin !== location.origin || event.data?.source !== WEB) return;
    const type = event.data.type;
    const requestId = typeof event.data.requestId === 'string' ? event.data.requestId.slice(0, 80) : ''; 
    if (!['START','STOP','PEEK','ACK','STATUS'].includes(type)) return;
    try {
      const response = await chrome.runtime.sendMessage({type, payload: event.data.payload ?? {}, pageOrigin: location.origin});
      window.postMessage({source: EXT, type, requestId, response}, location.origin);
    } catch {
      window.postMessage({source: EXT, type, requestId, response:{ok:false,error:'Extension connection unavailable'}}, location.origin);
    }
  });
  // Capture only paste into exam answer controls, never into passwords or unrelated UI.
  document.addEventListener('paste', (ev) => {
    const node=ev.target instanceof Element?ev.target:null;
    if(!node || node.closest('input[type=password],input[type=email],input[type=tel]'))return;
    const editable=node.closest('.monaco-editor,textarea,[contenteditable=true]');
    if(!editable)return;
    const txt=ev.clipboardData?.getData('text/plain')?.slice(0,2000);
    if(txt?.trim())void chrome.runtime.sendMessage({type:'EXAM_PASTE',text:txt}).catch(()=>{});
  },true);
  window.postMessage({source: EXT, type:'READY', response:{ok:true}}, location.origin);
})();
