/**
 * Code Studio stdin prompt heuristic. This is a UI hint, not a compiler or
 * runtime analysis: input in conditional or dynamically invoked code may differ.
 */
type SourceFile = { path: string; content: string };
type SourceWorkspace = { entry: string; files: SourceFile[] };

function executableLanguage(path: string): string | null {
  const ext = path.split(".").pop()?.toLowerCase();
  const languages: Record<string, string> = {
    c: "c", cpp: "cpp", cc: "cpp", cxx: "cpp",
    java: "java", py: "python", js: "javascript", mjs: "javascript", cjs: "javascript",
    ts: "typescript", tsx: "typescript", go: "go", rs: "rust", rb: "ruby", php: "php",
  };
  return ext ? languages[ext] ?? null : null;
}

/** Hide comments and quoted strings so `cout << "cin >>"` is not detected. */
function visibleCode(source: string, language: string): string {
  const result: string[] = [];
  const hashComment = language === "python" || language === "ruby" || language === "php";
  const slashComment = !["python", "ruby"].includes(language);
  const skip = (text: string) => text.replace(/[^\r\n]/g, " ");
  let pos = 0;
  while (pos < source.length) {
    const rest = source.slice(pos);
    if (hashComment && source[pos] === "#") {
      const end = source.indexOf("\n", pos);
      const next = end === -1 ? source.length : end;
      result.push(skip(source.slice(pos, next)));
      pos = next;
      continue;
    }
    if (slashComment && rest.startsWith("//")) {
      const end = source.indexOf("\n", pos);
      const next = end === -1 ? source.length : end;
      result.push(skip(source.slice(pos, next)));
      pos = next;
      continue;
    }
    if (slashComment && rest.startsWith("/*")) {
      const end = source.indexOf("*/", pos + 2);
      const next = end === -1 ? source.length : end + 2;
      result.push(skip(source.slice(pos, next)));
      pos = next;
      continue;
    }
    const quote = source[pos];
    if (quote === "'" || quote === '"' || quote === "`") {
      const triple = language === "python" && (quote === "'" || quote === '"') && rest.startsWith(quote.repeat(3));
      const delimiter = triple ? quote.repeat(3) : quote;
      let next = pos + delimiter.length;
      while (next < source.length) {
        if (source[next] === "\\") { next += 2; continue; }
        if (source.startsWith(delimiter, next)) { next += delimiter.length; break; }
        next++;
      }
      const literal = source.slice(pos, next);
      // PHP supports reading stdin by opening the special php://stdin stream.
      result.push(language === "php" && /^['\"]php:\/\/stdin['\"]$/i.test(literal)
        ? " __stdin_stream__ " : skip(literal));
      pos = next;
      continue;
    }
    result.push(source[pos]);
    pos++;
  }
  return result.join("");
}

const inputPatterns: Record<string, RegExp[]> = {
  cpp: [
    /\b(?:std\s*::\s*)?cin\s*>>/,
    /\b(?:std\s*::\s*)?getline\s*\(\s*(?:std\s*::\s*)?cin\b/,
    /\b(?:std\s*::\s*)?cin\s*\.\s*(?:get|getline|read|readsome)\s*\(/,
  ],
  c: [],
  python: [
    /\b(?:builtins\s*\.\s*)?input\s*\(/,
    /\b(?:sys\s*\.\s*)?stdin\s*\.\s*(?:read|readline|readlines)\s*\(/,
    /\bos\s*\.\s*read\s*\(\s*0\s*[,)]/,
    /\bopen\s*\(\s*0\s*[,)]/,
    /\bfileinput\s*\.\s*input\s*\(/,
  ],
  javascript: [
    /\bprocess\s*\.\s*stdin\b/, /\b(?:readFileSync)\s*\(\s*0\s*[,)]/,
    /\b(?:readline|rl)\s*\.\s*question\s*\(/,
    /\bprompt\s*\(/,
  ],
  typescript: [
    /\bprocess\s*\.\s*stdin\b/, /\b(?:readFileSync)\s*\(\s*0\s*[,)]/,
    /\b(?:readline|rl)\s*\.\s*question\s*\(/,
    /\bprompt\s*\(/,
    /\bDeno\s*\.\s*stdin\b/,
  ],
  java: [
    /\bSystem\s*\.\s*in\b/,
    /\bSystem\s*\.\s*console\s*\(\s*\)\s*\.\s*(?:readLine|readPassword)\s*\(/,
  ],
  go: [
    /\bfmt\s*\.\s*(?:Scan|Scanln|Scanf|Fscan|Fscanln|Fscanf)\s*\(/,
    /\bos\s*\.\s*Stdin\b/,
  ],
  rust: [
    /\b(?:std\s*::\s*io\s*::\s*)?stdin\s*\(/,
    /\b(?:std\s*::\s*io\s*::\s*)?stdin\b/,
    /\b(?:read_line|read_to_string)\s*\(/,
  ],
  ruby: [
    /\b(?:STDIN\s*\.\s*)?(?:gets|readline)\b/,
    /\bSTDIN\s*\.\s*(?:read|readlines|each_line)\b/,
  ],
  php: [
    /\breadline\s*\(/,
    /\b(?:fgets|fread|stream_get_contents)\s*\(\s*STDIN\b/,
    /\bfile_get_contents\s*\(\s*__stdin_stream__\s*\)/,
  ],
};
inputPatterns.c = [
  /\b(?:scanf|fscanf|getchar|getchar_unlocked|gets|getc|fgets|fread)\s*\(/,
  /\b(?:read)\s*\(\s*0\s*[,)]/,
];
inputPatterns.cpp.push(...inputPatterns.c);

export function sourceMayReadStdin(language: string, source: string): boolean {
  const patterns = inputPatterns[language];
  if (!patterns?.length) return false;
  const visible = visibleCode(source, language);
  return patterns.some(pattern => pattern.test(visible));
}

/** Include the entry and the helper units the workspace runner may compile. */
export function workspaceMayReadStdin(workspace: SourceWorkspace): boolean {
  const language = executableLanguage(workspace.entry);
  if (!language) return false;
  const entry = workspace.files.find(file => file.path === workspace.entry);
  if (!entry) return false;
  let participating: SourceFile[] = [entry];
  if (language === "java") {
    participating = workspace.files.filter(file => file.path.toLowerCase().endsWith(".java"));
  } else if (language === "cpp" || language === "c") {
    // The backend excludes other independent main() translation units.
    participating = workspace.files.filter(file => {
      if (file.path === workspace.entry) return true;
      if (executableLanguage(file.path) !== language) return false;
      return !/\b(?:int|signed|auto|void|int32_t|int64_t)\s+main\s*\(/.test(visibleCode(file.content, language));
    });
  } else if (language === "go") {
    const folder = (p: string) => p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "";
    participating = workspace.files.filter(file => file.path === workspace.entry ||
      (executableLanguage(file.path) === "go" && folder(file.path) === folder(workspace.entry) &&
        !/\bfunc\s+main\s*\(/.test(visibleCode(file.content, "go"))));
  }
  return participating.some(file => sourceMayReadStdin(language, file.content));
}
