# Palette's Journal

## 2024-05-22 - Star Rating Accessibility
**Learning:** Star ratings built with individual icons are noisy for screen readers (reading "star star star").
**Action:** Wrap stars in a container with role="img" and a descriptive aria-label (e.g., "4.5 out of 5 stars"), and hide individual icons with aria-hidden="true".
