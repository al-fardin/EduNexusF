# Unified orbital loading - 2026-11-28

The authentication ring and approved logo now form one shared loading system:
`LoadingScreen`, `LoadingIndicator` and `LoadingIcon`. Authentication and route
transitions use the full-screen scene. Data panels, message lists, classroom
views, exam admission, materials, previews and lazy code editors use the panel
or compact version. Existing spinner actions and toast loading icons use the
same artwork at button size. Shared skeleton entry points remain compatible.

Save, refresh, download, scan and upload states use the same icon. Actual upload
percentages, cancellation, error/retry controls and request timing are retained.
There is no simulated progress or minimum animation duration. Background saves
use a small status indicator rather than blocking the screen.

SVG IDs remain unique per instance. Decorative artwork is hidden from assistive
technology; panel/full-screen status text remains available. The orbital wrapper
is an inline span, so compact icons remain valid inside buttons and paragraphs.
Reduced-motion disables rotation and the animated track. The interface's
decorative Pause control does not suspend active-operation status indicators.

## Verification

- Lint and TypeScript passed; all 101 frontend tests passed. Test selectors now
  read button text independently of decorative children.
- Production build generated 31 static pages and the dynamic routes.
- Headless Chrome checked the actual shared components in an isolated fixture
  at 320/390/1440 widths, light/dark, button/panel/full-screen presentations,
  moving rings, reduced motion and valid inline structure. Screenshots reviewed.
  The fixture substitutes Next's image wrapper while displaying the actual logo.
- Existing development-server hot reload instability prevents reliable full live
  navigation checks. Fixture verification does not establish every route's
  end-to-end backend behavior. Backend code was unchanged.
