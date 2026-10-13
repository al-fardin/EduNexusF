// EduNexus V13.2: Newly submitted prompts and selection-copy on approved AI sites.
// Exam-scoped. Never scans chat history, message responses, passwords or other sites.
(() => {
  if (globalThis.__edunexusAiMonitorV132) return;
  globalThis.__edunexusAiMonitorV132 = true;

  const hosts = new Set(['chatgpt.com', 'chat.openai.com', 'claude.ai', 'gemini.google.com']);
  const host = location.hostname.toLowerCase();
  if (!hosts.has(host)) return;
  const limit = value => String(value ?? '').replace(/\u200b/g, '').slice(0, 2000);
  let lastText = '', lastSentAt = 0;
  const selectors = host.includes('chatgpt') || host === 'chat.openai.com'
    ? ['#prompt-textarea', '[data-testid="prompt-textarea"]', '[data-testid="composer-input"] [contenteditable="true"]', 'form [contenteditable="true"]', 'form textarea']
    : host === 'claude.ai'
      ? ['[data-testid="chat-input"] [contenteditable="true"]', '[data-testid="chat-input"]', '.ProseMirror[contenteditable="true"]', 'form [contenteditable="true"]', 'form textarea']
      : ['rich-textarea [contenteditable="true"]', '.ql-editor[contenteditable="true"]', '[aria-label*="prompt" i][contenteditable="true"]', 'form [contenteditable="true"]', 'form textarea'];

  function isVisible(element) {
    return element instanceof HTMLElement && element.isConnected && element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== 'hidden';
  }
  function editable(element) {
    if (!(element instanceof Element)) return null;
    const box = element.closest('textarea, [contenteditable="true"], [role="textbox"]');
    if (!box || !isVisible(box) || box.closest('input[type="password"], [aria-hidden="true"]')) return null;
    return box;
  }
  function matchesComposer(node) {
    if (!node) return false;
    return selectors.some(sel => { try { return node.matches(sel) || !!node.closest(sel); } catch {return false;} });
  }
  function findComposer(target) {
    const focused = editable(target) || editable(document.activeElement);
    if (focused && matchesComposer(focused)) return focused;
    for (const selector of selectors) {
      const nodes = Array.from(document.querySelectorAll(selector));
      const candidate = nodes.find(isVisible);
      if (candidate) return editable(candidate) || candidate;
    }
    return null;
  }
  function readComposer(node) {
    if (!node) return '';
    const value = 'value' in node ? node.value : node.innerText;
    return limit(value).trim();
  }
  function capturePrompt(target) {
    const text = readComposer(findComposer(target));
    if (!text || (text === lastText && Date.now() - lastSentAt < 2500)) return;
    lastText = text;
    lastSentAt = Date.now();
    // Background validates an active consented session and the sender's exact AI domain.
    void chrome.runtime.sendMessage({type: 'EXTERNAL_EVIDENCE', kind: 'ai_prompt', text, sentAt: Date.now()}).catch(() => {});
  }
  function isSendButton(element) {
    const button = element instanceof Element ? element.closest('button, [role="button"]') : null;
    if (!button || !isVisible(button)) return false;
    const parts = [button.getAttribute('aria-label'), button.getAttribute('data-testid'), button.getAttribute('title'), button.getAttribute('name')]
      .filter(Boolean).join(' ').toLowerCase();
    if (/send|submit|run prompt|composer-send/.test(parts)) return true;
    return button.matches('button[type="submit"]') && !!findComposer(button);
  }

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.altKey) return;
    const target = editable(event.target);
    if (target && matchesComposer(target)) capturePrompt(target);
  }, true);
  document.addEventListener('submit', event => {
    const box = findComposer(event.target);
    if (box && (event.target.contains(box) || event.target.closest('main'))) capturePrompt(box);
  }, true);
  // pointerdown occurs before React clears the composer in its click handler.
  for (const type of ['pointerdown', 'click']) {
    document.addEventListener(type, event => {
      if (isSendButton(event.target)) capturePrompt(event.target);
    }, true);
  }
  document.addEventListener('copy', () => {
    const text = limit(window.getSelection()?.toString());
    if (text.trim()) void chrome.runtime.sendMessage({type: 'EXTERNAL_EVIDENCE', kind: 'external_copy', text, sentAt: Date.now()}).catch(() => {});
  }, true);

  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (message?.type === 'AI_MONITOR_PING') {
      respond({ready: true, version: '1.3.2', domain: host});
    }
  });
  void chrome.runtime.sendMessage({type: 'AI_MONITOR_READY', domain: host}).catch(() => {});
})();
