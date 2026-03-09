import type { RouteConfig } from "@react-router/dev/routes";

export default [
  {
    path: "/",
    file: "routes/_index.tsx",
  },
  {
    path: "/documents",
    file: "routes/documents.tsx",
  },
  {
    path: "/lemmas",
    file: "routes/lemmas.tsx",
  },
  {
    path: "/wordforms",
    file: "routes/wordforms.tsx",
  },
  {
    path: "/search",
    file: "routes/search.tsx",
  },
  {
    path: "/tokens",
    file: "routes/tokens.tsx",
  },
  {
    path: "/pos-stats",
    file: "routes/pos-stats.tsx",
  }
] satisfies RouteConfig;