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
  }
] satisfies RouteConfig;