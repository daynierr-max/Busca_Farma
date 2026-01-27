# Palette's Journal - Critical Learnings

This journal records only CRITICAL UX/accessibility learnings.

## 2025-05-18 - Accessible Star Rating Pattern
**Learning:** Star ratings are often implemented as separate icons which leads to redundant screen reader announcements ("star star star").
**Action:** Always wrap star ratings in a container with `role="img"` and a descriptive `aria-label`, hiding the individual icons.
