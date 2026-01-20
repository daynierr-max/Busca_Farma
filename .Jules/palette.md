## 2025-02-17 - Missing Vite Entry Point & A11y
**Learning:** React Vite projects may sometimes be initialized without the critical `<script type="module" src="/index.tsx"></script>` in `index.html`, leading to a blank screen in dev mode. This blocks visual verification.
**Action:** Always verify `index.html` contains the entry point script when inspecting a new Vite project.

**Learning:** Icon-only buttons are a common accessibility anti-pattern in rapid prototypes. Adding `aria-label` provides immediate value.
**Action:** Systematically scan for `<i>` inside `<button>` without text during the "OBSERVE" phase.
