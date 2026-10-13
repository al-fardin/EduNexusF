import { api } from "@/lib/api";

export type WorkspaceFile = { path: string; content: string };
export type Workspace = { v: 1; files: WorkspaceFile[]; folders: string[]; entry: string };
export const WORKSPACE_PREFIX = "EDUNEXUS_WORKSPACE_V1:";

export const languageExtension = (language: string) => {
  const l = language.toLowerCase();
  if (l === "java") return ".java";
  if (["python", "py", "python3"].includes(l)) return ".py";
  if (["javascript", "js", "node"].includes(l)) return ".js";
  if (["typescript", "ts"].includes(l)) return ".ts";
  if (["cpp", "c++", "c++17"].includes(l)) return ".cpp";
  if (l === "c") return ".c";
  if (["go", "golang"].includes(l)) return ".go";
  if (["rust", "rs"].includes(l)) return ".rs";
  if (["ruby", "rb"].includes(l)) return ".rb";
  if (l === "php") return ".php";
  return ".txt";
};
export const detectFileLanguage = (filename: string): string | null => {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  const supported: Record<string,string> = {
    py:'python', js:'javascript', mjs:'javascript', cjs:'javascript',
    ts:'typescript', tsx:'typescript', java:'java', cpp:'cpp', cc:'cpp',
    cxx:'cpp', c:'c', go:'go', rs:'rust', rb:'ruby', php:'php'
  };
  return supported[extension] ?? null;
};
export const startingFile = (language: string) => (language.toLowerCase() === "java" ? "Main.java" : `main${languageExtension(language)}`);
export const startingCode = (language: string) => {
  switch (language.toLowerCase()) {
    case "java": return 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello EduNexus");\n    }\n}\n';
    case "python": return 'print("Hello EduNexus")\n';
    case "javascript": return 'console.log("Hello EduNexus");\n';
    case "typescript": return 'console.log("Hello EduNexus");\n';
    case "c": return '#include <stdio.h>\nint main(void) { puts("Hello EduNexus"); return 0; }\n';
    case "cpp": return '#include <iostream>\nint main() { std::cout << "Hello EduNexus\\n"; }\n';
    case "go": return 'package main\nimport "fmt"\nfunc main() { fmt.Println("Hello EduNexus") }\n';
    default: return "";
  }
};

export function parseWorkspace(value: string, language: string): Workspace {
  const first = startingFile(language);
  if (value.startsWith(WORKSPACE_PREFIX)) {
    try {
      const data: unknown = JSON.parse(value.slice(WORKSPACE_PREFIX.length));
      if (data && typeof data === "object" && "files" in data && Array.isArray(data.files)) {
        const w = data as Workspace;
        if (w.v === 1 && w.files.every(f => typeof f.path === "string" && typeof f.content === "string")) {
          return { v: 1, files: w.files, folders: Array.isArray(w.folders) ? w.folders : [], entry: typeof w.entry === "string" ? w.entry : (w.files[0]?.path ?? "") };
        }
      }
    } catch { /* Keep legacy answer if malformed. */ }
  }
  // Brand-new attempts open an empty workspace. A previous plain-text answer
  // remains available as one legacy source file and is never discarded.
  if (!value.trim()) return { v:1, files:[], folders:[], entry:"" };
  return { v:1, files:[{path:first,content:value}], folders:[], entry:first };
}
export function prettyWorkspaceAnswer(answer: string): string {
  if (!answer.startsWith(WORKSPACE_PREFIX)) return answer;
  try {
    const parsed = JSON.parse(answer.slice(WORKSPACE_PREFIX.length)) as Workspace;
    if (!Array.isArray(parsed.files)) return answer;
    return parsed.files.map(f => `// ── ${f.path} ──\n${f.content}`).join("\n\n");
  } catch { return answer; }
}
export type RunOutput = { status: string; stdout: string; stderr: string; duration_ms: number; truncated: boolean };
export async function runWorkspace(classId: string, examId: string, questionId: string, workspace: Workspace, stdin: string): Promise<RunOutput> {
  const res = await api.post<{ success: boolean; data: RunOutput }>(`/classrooms/${classId}/exams/${examId}/run-workspace`, {
    question_id: questionId, entry: workspace.entry, files: workspace.files, stdin,
  });
  return res.data.data;
}
