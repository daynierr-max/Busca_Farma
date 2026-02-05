## 2024-05-23 - Accessibility Gaps in Icon Buttons
**Learning:** The application systematically uses icon-only buttons without `aria-label` attributes, rendering critical navigation and interaction elements (menu, user profile, scanner, close buttons) invisible to screen reader users.
**Action:** Always enforce a rule that every button with only an icon must have an `aria-label`. For future components, use a `IconButton` wrapper that requires a `label` prop to prevent this pattern from recurring.
