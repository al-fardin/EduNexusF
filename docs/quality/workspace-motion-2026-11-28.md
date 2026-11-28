# Workspace motion - 2026-11-28

Class covers now share the landing page's orbital identity: metallic rings,
satellites and stars. Each classroom ID determines its palette, orientation,
duration and phase. SVG gradients use instance IDs, so repeated covers cannot
accidentally reference another card's gradients.

Desktop cards respond to the pointer with a small tilt and a moving light.
Pointer updates use one animation frame, without React rerenders. Leaving or
unmounting cancels pending work. Touch keeps normal scrolling and navigation,
with tap feedback instead of tilt.

Shared tools, activity rows, panels, tabs and buttons have matching interaction
feedback. Class links, permissions and menu actions retain their existing logic.
All displayed classroom data still comes from the existing workspace service.

The header's Pause/Play control stops decorative animation without stopping
pending-action spinners. The preference remains while the app shell is mounted.
System reduced-motion preferences also suppress movement. Offscreen cover
animation pauses through IntersectionObserver. No animation library or external
media request was added.

## Verification

- Lint, TypeScript and all 101 existing frontend tests passed. The card permission
  test helper now loads the real pointer hook during server rendering.
- Production build generated all 31 static pages and dynamic routes successfully.
- Headless Chrome checked actual cover/pointer-hook components in an isolated
  fixture with compiled app styles: 320, 390 and 1440 pixel layouts, dark/light,
  pointer movement/reset, orbital movement, pause/play, reduced motion and unique
  SVG IDs. Screenshots were visually reviewed.
- Full live workspace navigation checks could not complete because the existing
  development server repeatedly reloaded. Fixture checks do not establish
  end-to-end account, routing or real-device behavior. Backend code was unchanged.
