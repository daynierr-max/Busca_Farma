## 2025-10-27 - Icon-Only Button Accessibility Pattern
**Learning:** Consistently observed icon-only buttons (menu, profile, close actions) implemented without `aria-label` attributes, relying solely on visual icons. This renders core navigation and actions inaccessible to screen readers.
**Action:** Enforce a "Text or Label" rule for all buttons: if no visible text exists, `aria-label` is mandatory, and the icon must be hidden from assistive technology with `aria-hidden="true"`.
