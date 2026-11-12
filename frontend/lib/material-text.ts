// Bound rendering work even when a long document contains a very frequent term.
export function textMatches(text: string, query: string, limit = 200) {
  const parts: Array<{ text: string; match: boolean }> = [];
  const needle = query.trim().toLocaleLowerCase();
  if (needle.length < 2)
    return { parts: [{ text, match: false }], count: 0, capped: false };
  const lower = text.toLocaleLowerCase();
  let at = 0,
    count = 0,
    found = lower.indexOf(needle);
  while (found >= 0 && count < limit) {
    if (found > at) parts.push({ text: text.slice(at, found), match: false });
    parts.push({ text: text.slice(found, found + needle.length), match: true });
    at = found + needle.length;
    count++;
    found = lower.indexOf(needle, at);
  }
  if (at < text.length) parts.push({ text: text.slice(at), match: false });
  return { parts, count, capped: found >= 0 };
}
