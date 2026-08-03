// These are injected at build time by the GitHub Actions workflow via
// VITE_* env vars. Locally they fall back to "dev".
const env = import.meta.env as Record<string, string | undefined>;

export const APP_SHA = env.VITE_APP_VERSION ?? "dev";
export const SHORT_SHA = APP_SHA.slice(0, 7);
export const APP_RUN = env.VITE_RUN ?? "";
export const APP_BUILD_TIME = env.VITE_BUILD_TIME ?? "";

export const BUILD_LABEL =
  `build ${APP_RUN ? "#" + APP_RUN + " · " : ""}${SHORT_SHA}` +
  (APP_BUILD_TIME ? ` · ${APP_BUILD_TIME}` : "");
