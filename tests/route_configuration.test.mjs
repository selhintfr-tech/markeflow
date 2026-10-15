import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * Extracts route definitions statically from AppRoutes.tsx
 */
export function extractRoutesFromSource(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const routeRegex = /<Route\s+path="([^"]+)"/g;
  const routes = [];
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    routes.push(match[1]);
  }
  return {
    routes,
    hasCatchAll: content.includes('path="*"'),
    hasAppLayout: content.includes("<AppLayout />") || content.includes("<Route element={<AppLayout />}"),
    hasSuspense: content.includes("<Suspense fallback="),
  };
}

describe("Route Configuration — Route Audit and Declarations", () => {
  const routesFile = path.resolve(process.cwd(), "src/app/routes/AppRoutes.tsx");
  const { routes, hasCatchAll, hasAppLayout, hasSuspense } = extractRoutesFromSource(routesFile);

  test("AppRoutes.tsx exists and is readable", () => {
    assert.ok(fs.existsSync(routesFile), "src/app/routes/AppRoutes.tsx must exist");
  });

  test("defines all required public authentication routes", () => {
    const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];
    for (const route of authRoutes) {
      assert.ok(routes.includes(route), `Public auth route "${route}" must be declared`);
    }
  });

  test("defines core workspace, project, and campaign routes", () => {
    const coreRoutes = [
      "/",
      "/workspaces",
      "/projects",
      "/projects/:projectId",
      "/strategies",
      "/strategies/:strategyId/swot",
      "/market-research",
      "/audiences",
      "/campaigns",
      "/campaigns/:campaignId",
      "/calendar",
      "/tasks",
    ];
    for (const route of coreRoutes) {
      assert.ok(routes.includes(route), `Core route "${route}" must be declared`);
    }
  });

  test("defines finance, CRM, and insights routes including aliases", () => {
    const financeRoutes = [
      "/crm",
      "/crm-leads",
      "/finance/budget",
      "/budget-expenses",
      "/finance/profitability",
      "/profitability",
      "/analytics",
      "/reports",
      "/comparisons",
    ];
    for (const route of financeRoutes) {
      assert.ok(routes.includes(route), `Finance/CRM route "${route}" must be declared`);
    }
  });

  test("defines system, settings, and profile routes", () => {
    const systemRoutes = ["/archive", "/settings", "/settings/profile", "/profile"];
    for (const route of systemRoutes) {
      assert.ok(routes.includes(route), `System route "${route}" must be declared`);
    }
  });

  test("includes catch-all wildcard route and essential structural wrappers", () => {
    assert.equal(hasCatchAll, true, "Catch-all '*' route must be defined for unmatched paths");
    assert.equal(hasAppLayout, true, "Protected routes must be wrapped with AppLayout");
    assert.equal(hasSuspense, true, "Route trees must be wrapped with Suspense fallback");
  });

  test("contains no empty or duplicate route paths", () => {
    const seen = new Set();
    for (const r of routes) {
      assert.ok(r.trim().length > 0, "Route path cannot be empty");
      assert.equal(seen.has(r), false, `Duplicate route definition found: "${r}"`);
      seen.add(r);
    }
  });
});
