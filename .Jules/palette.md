## 2026-01-18 - Accessible Icon-Only Buttons
**Learning:** Icon-only buttons are a common pattern in this app but completely inaccessible without `aria-label`. Visually they are clear, but blindly navigating the app is impossible. Also, star ratings using repeated icons need a container label to be meaningful.
**Action:** Always audit icon-only buttons first. Use `role="img"` and `aria-label` for complex visual data like ratings.
