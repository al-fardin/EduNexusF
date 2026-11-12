const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const root = path.resolve(__dirname, "../..");

function loadComponent(file, mocks, extra = "") {
  const exports = {};
  const source = ts.transpileModule(
    fs.readFileSync(path.join(root, file), "utf8") + extra,
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText;
  vm.runInNewContext(source, {
    exports,
    require(name) {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name === "react" || name === "react/jsx-runtime") return require(name);
      throw Error(`Unexpected component dependency: ${name}`);
    },
  });
  return exports;
}

// Framework routing, fetching, drawing and menu portals are outside these
// component tests. The actual card decides which action children exist.
function cardMarkup(actor, status = "active", kind = "teacher") {
  const wrapper = ({ children }) => React.createElement("div", null, children);
  const item = ({ children }) => React.createElement("div", { role: "menuitem" }, children);
  const { ClassroomCard } = loadComponent("components/classroom/classroom-card.tsx", {
    "@/store/auth-store": { useAuthStore: (select) => select({ user: { id: actor } }) },
    "next/link": ({ children, ...props }) => React.createElement("a", props, children),
    "lucide-react": new Proxy({}, { get: () => () => null }),
    "@tanstack/react-query": { useQuery: () => ({}) },
    "@/components/classroom/course-cover": { CourseCover: () => null },
    "@/services/classroom": { classroomService: {} },
    "@/lib/clipboard": { copyText: async () => {} },
    "@/components/classroom/classroom-header": { ClassroomDetailsDialog: () => null },
    "@/components/ui/dropdown-menu": {
      DropdownMenu: wrapper,
      DropdownMenuContent: wrapper,
      DropdownMenuItem: item,
      DropdownMenuSeparator: () => React.createElement("hr"),
      DropdownMenuTrigger: ({ children, ...props }) => React.createElement("button", props, children),
    },
  });
  return renderToStaticMarkup(React.createElement(ClassroomCard, {
    classroom: { id: "88888888-8888-4888-8888-888888888888", owner_id: "owner", name: "Database Systems", teacher_name: "Amina Rahman", status },
    kind,
    onArchive() {},
    onDelete() {},
    ...(kind === "student" ? { onLeave() {} } : {}),
  }));
}

function reportMarkup(language = "en") {
  const translations = { Student: "শিক্ষার্থী", "Choose a student": "শিক্ষার্থী বেছে নিন", "Teacher note": "শিক্ষকের মন্তব্য", "Create preview": "প্রিভিউ তৈরি করুন" };
  const { TestedCreateReport } = loadComponent("components/classroom/academic-reports.tsx", {
    "@tanstack/react-query": { useQuery: () => ({ data: { students: [{ id: "student-id", name: "রাফি আহমেদ", roll: "001" }] } }) },
    "@/lib/api": {},
    "@/services/academic-tools": {},
    "@/lib/client-id": { clientId: () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
    "@/providers/preferences-provider": { usePreferences: () => ({ t: (text) => language === "bn" ? translations[text] ?? text : text }) },
    "@/lib/academic-report-pdf": {},
    "@/components/ui/button": { Button: ({ children, ...props }) => React.createElement("button", props, children) },
    "@/components/ui/reason-dialog": {},
    "@/components/ui/app-feedback": {},
    "@/components/ui/content-skeleton": {},
    "@/components/ui/dialog": {},
    "@/services/exams": {},
  }, "\nexport { CreateReport as TestedCreateReport };\n");
  return renderToStaticMarkup(React.createElement(TestedCreateReport, { classId: "class-id", saved() {} }));
}
module.exports = { cardMarkup, reportMarkup };
