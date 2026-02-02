# Palette's Journal - Critical UX/A11y Learnings

This journal records only critical insights, patterns, and decisions.

## 2024-05-22 - [Accessible Interactive Elements]
**Learning:** Icon-only buttons are a recurring pattern in this application (App.tsx, ScannerView.tsx, PharmacyBottomSheet.tsx) that consistently lack accessible names.
**Action:** Standardize the use of `aria-label` on all icon-only buttons during component creation.
