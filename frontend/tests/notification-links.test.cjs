const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { loadComponent } = require("./helpers/classroom-component-render.cjs");
const paths = loadComponent("lib/return-path.ts", {});

test("notification links open invitation destinations and reject external addresses", () => {
  const invitation = "/invitations?invite=aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const Wrapper = ({ children }) => React.createElement("div", null, children);
  const { default: Notifications } = loadComponent("app/notifications/page.tsx", {
    "@/components/workspace/enrollment-inbox": { EnrollmentNotice: () => null },
    "@/components/ui/localized": { Localized: Wrapper },
    "@/lib/return-path": paths,
    "@/components/settings/push-settings": {},
    "@/components/ui/content-skeleton": {},
    "@/components/ui/button": { Button: ({ children, ...props }) => React.createElement("button", props, children) },
    "@/components/ui/app-feedback": {},
    "next/link": ({ children, ...props }) => React.createElement("a", props, children),
    "@tanstack/react-query": {
      useQueryClient: () => ({}),
      useQuery: ({ queryKey }) => queryKey[0] === "notifications" ? { data: {
        unread_count: 2, classes: [], next_offset: -1,
        items: [invitation, "https://example.invalid/attack"].map((url, id) => ({ id: String(id), url, title: "Invitation", kind: "invitation", created_at: "2026-11-27T00:00:00Z", unread: true, group_count: 1 })),
      } } : {},
    },
    "@/components/auth/auth-guard": { AuthGuard: Wrapper },
    "@/services/notifications": {},
    "@/services/exams": {},
    "@/store/auth-store": { useAuthStore: select => select({ user: { id: "user" } }) },
  });
  const html = renderToStaticMarkup(React.createElement(Notifications));
  assert.ok(html.includes(`href="${invitation}"`));
  assert.ok(html.includes('href="/"'));
  assert.ok(!html.includes("https://example.invalid/attack"));
});
