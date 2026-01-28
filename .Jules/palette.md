## 2026-01-28 - Accessibility of Icon-only Buttons and Ratings
**Learning:** Icon-only buttons are a common pattern here but often lack `aria-label`, making them inaccessible. Complex components like star ratings also need `role="img"` and descriptive labels to be intelligible to screen readers.
**Action:** Always add `aria-label` to icon-only buttons and hide internal icons with `aria-hidden="true"`. For ratings, use a container with `role="img"` and a summary label.
