// Gemini models used by the app. Single place to update them if Google retires one;
// `npm run check:gemini` verifies they are available for your API key.
export const MODELS = {
  search: "gemini-2.5-flash",
  scan: "gemini-3-flash-preview",
  live: "gemini-2.5-flash-native-audio-preview-12-2025",
} as const;
