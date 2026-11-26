const test = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { loadComponent } = require("./helpers/classroom-component-render.cjs");

for (const remaining of [0, 1]) {
  test(`classroom changes refresh workspace data and keep a page with ${remaining} classes`, async () => {
    const invalidated = [], pages = [];
    let mutation;
    const { Collection } = loadComponent("components/classroom/classroom-collection.tsx", {
      react: { ...React, useState: () => [2, update => pages.push(update(2))] },
      "next/link": () => null,
      "lucide-react": { Plus: () => null },
      "@tanstack/react-query": {
        useQueryClient: () => ({
          invalidateQueries: async ({ queryKey }) => invalidated.push(queryKey[0]),
          getQueryData: () => ({ items: Array(remaining).fill({ id: "class" }) }),
        }),
        useQuery: () => ({ data: { items: [{ id: "class" }] } }),
        useMutation: options => { mutation = options; return {}; },
      },
      "@/components/auth/auth-guard": {},
      "@/components/classroom/classroom-card": { ClassroomCard: () => null },
      "@/components/ui/content-skeleton": {},
      "@/services/classroom": {},
    }, "\nexport { Collection };\n");
    Collection({ kind: "teacher" });
    await mutation.onSuccess();
    assert.deepEqual(invalidated.sort(), ["classrooms", "task-inbox", "workspace", "workspace-files"]);
    assert.deepEqual(pages, remaining ? [] : [1]);
  });
}
