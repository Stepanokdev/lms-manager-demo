# The landing page

`index.html` is the source. Edit it directly.

That is unusual, so it needs explaining.

This page began as a Next.js App Router static export (Turbopack, React 19
canary, Tailwind v4). **That project's source does not exist** — not in this
repository, not anywhere on the machine it was built on. The export was the only
artifact ever committed.

An export like that cannot be hand-edited while it still hydrates. The shipped
markup is server-rendered HTML that React re-creates from a client chunk on load,
so an edit to the HTML looks right in `view-source` and in `curl`, and is silently
discarded the moment a browser runs the page. That was verified rather than
assumed: an injected `<section>` and a hero text change both vanished from the
post-hydration DOM, and React's SSR text-separator comments went from 4 to 0,
showing it had thrown the server HTML away and re-rendered.

So the page was **de-hydrated**: every `<script>` was removed, and the 30
`style="opacity:0;transform:…"` scroll-reveal start states became `data-reveal`
attributes. The compiled stylesheet, the fonts and every image are untouched —
the page renders pixel-for-pixel as before.

## What to know when editing

- **It is plain HTML now.** No build step, no framework. Change `index.html` and
  reload.
- **The stylesheet is JIT-pruned.** `_next/static/chunks/12k2pouvsm69s.css`
  contains only the Tailwind utilities the original page used — `md:grid-cols-3`,
  for instance, is not in it. Check before you reach for a class, or add rules to
  the `<style>` block in `<head>` (that is what the "three shapes" section does,
  using the page's own custom properties).
- **The reveal animation is progressive enhancement.** The inline `<script>` at
  the end of `<body>` adds the hidden start state itself, so a page with no
  JavaScript — or a headless renderer that never fires an observer — shows
  everything. A 2-second timer reveals anything the observer missed. Never gate
  content on a class that only JavaScript can add.
- **Fonts live under `_next/static/media/`** and are referenced by the CSS with
  relative `../media/…` paths. They look unreferenced if you only grep the HTML.
  Don't delete them.

## What was lost

The scroll-reveal choreography (rebuilt, simpler) and two small `useState`
widgets that toggled local UI state. The CSS keyframe animations — `float`,
`marquee`, `pulse-soft` — never needed JavaScript and still run.

## What was removed

The React runtime and page chunks, the build manifests, the stale RSC flight
payloads (`index.txt`, `__next.*.txt`), and the exported 404 page, which pointed
at chunks that no longer exist and was never routed by the app anyway.
