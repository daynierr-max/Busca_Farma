## 2025-02-18 - Accessible Star Ratings
**Learning:** Individual star icons in a rating component create noisy screen reader output ("star star star star star").
**Action:** Use a container with role="img" and a single descriptive aria-label (e.g., "Rating: 4.5 out of 5 stars"), while hiding individual star icons with aria-hidden="true".

## 2025-02-18 - Icon-Only Buttons
**Learning:** The app frequently uses icon-only buttons for critical navigation (menu, profile, close) without accessible names.
**Action:** Always verify icon-only buttons have aria-label and hide the internal icon to prevent redundant announcements.
