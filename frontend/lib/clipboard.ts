/** Supports the local HTTP Android preview as well as HTTPS browsers. */
export async function copyText(text: string) {
  if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return; }
  const input = document.createElement("textarea");
  input.value = text; input.style.position = "fixed"; input.style.opacity = "0";
  document.body.appendChild(input); input.select();
  try { if (!document.execCommand("copy")) throw new Error("Clipboard unavailable"); }
  finally { input.remove(); }
}
