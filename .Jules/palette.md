## 2026-01-24 - Critical Navigation Accessibility Gap
**Learning:** Core navigation elements (Menu, Profile, Back) and the main Search input were completely inaccessible to screen reader users due to reliance on visual-only icons and missing labels. This is a critical pattern failure in icon-heavy interfaces.
**Action:** Always enforce `aria-label` on icon-only buttons and `aria-hidden="true"` on the internal icon elements during component creation.
