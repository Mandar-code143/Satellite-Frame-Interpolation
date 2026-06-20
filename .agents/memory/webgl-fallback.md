---
name: WebGL unavailable in Replit preview
description: Three.js / React Three Fiber WebGL fails in the Replit preview iframe; use Canvas 2D or CSS instead
---

The Replit preview pane is a proxied iframe. WebGL context creation fails with "Could not create a WebGL context, BindToCurrentSequence failed". This affects Three.js, React Three Fiber, and any other WebGL-based rendering.

**Rule:** Never use Three.js / R3F / WebGL in the frontend for anything that needs to work in the Replit preview. Use Canvas 2D (requestAnimationFrame loop) or CSS/SVG animations instead.

**Why:** The Replit sandbox screenshot tool and preview iframe both run in headless/sandboxed environments without GPU/WebGL access.

**How to apply:** Replace any `<Canvas>` (R3F) component with a `<canvas ref={...}>` using the 2D context (`getContext('2d')`). CSS `@keyframes` and Framer Motion work fine.
