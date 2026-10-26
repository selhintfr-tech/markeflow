import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { initialCampaignFinancials } from "../src/features/finance/profitabilityData.ts";

const initialTasks = [
  { id: "t1", title: "Creative direction review", workspaceId: "ws-atlas-retail" },
  { id: "t2", title: "Copywriting for ad launch", workspaceId: "ws-atlas-retail" },
  { id: "t3", title: "Solis Solar Task", workspaceId: "ws-solis-energy" },
];

const initialCampaignsList = [
  { id: "c1", name: "Autumn Launch 2026", workspaceId: "ws-atlas-retail" },
  { id: "c2", name: "Solis Promo", workspaceId: "ws-solis-energy" },
];

/**
 * Workspace isolation and multi-tenant scoping functions
 */
export function getWorkspaceFinancials(financialsMap, workspaceId) {
  if (!financialsMap || typeof financialsMap !== "object") return [];
  const list = financialsMap[workspaceId];
  if (Array.isArray(list) && list.length > 0) return list;
  return [];
}

export function getWorkspaceTasks(tasks, workspaceId) {
  if (!Array.isArray(tasks)) return [];
  return tasks.filter((t) => t.workspaceId === workspaceId);
}

export function getWorkspaceCampaigns(campaigns, workspaceId) {
  if (!Array.isArray(campaigns)) return [];
  return campaigns.filter((c) => c.workspaceId === workspaceId);
}

describe("Workspace Scoping — Multi-Tenant Isolation", () => {
  test("financials are strictly isolated by workspace ID", () => {
    const atlasFinancials = getWorkspaceFinancials(initialCampaignFinancials, "ws-atlas-retail");
    const solisFinancials = getWorkspaceFinancials(initialCampaignFinancials, "ws-solis-energy");
    const nordicFinancials = getWorkspaceFinancials(initialCampaignFinancials, "ws-nordic-craft");
    const zenithFinancials = getWorkspaceFinancials(initialCampaignFinancials, "ws-zenith-media");

    assert.ok(atlasFinancials.length >= 3);
    assert.ok(solisFinancials.length >= 1);
    assert.ok(nordicFinancials.length >= 1);
    assert.ok(zenithFinancials.length >= 1);

    // Cross-tenant non-leakage check
    assert.ok(atlasFinancials.every((c) => c.workspaceId === "ws-atlas-retail"));
    assert.ok(solisFinancials.every((c) => c.workspaceId === "ws-solis-energy"));
    assert.ok(nordicFinancials.every((c) => c.workspaceId === "ws-nordic-craft"));
    assert.ok(zenithFinancials.every((c) => c.workspaceId === "ws-zenith-media"));

    const atlasIds = new Set(atlasFinancials.map((c) => c.id));
    const solisIds = new Set(solisFinancials.map((c) => c.id));

    // Ensure zero overlap between tenant IDs
    for (const id of solisIds) {
      assert.equal(atlasIds.has(id), false, `Tenant overlap detected for ID ${id}`);
    }
  });

  test("unknown workspace returns empty array without throwing", () => {
    const unknown = getWorkspaceFinancials(initialCampaignFinancials, "ws-non-existent-workspace");
    assert.deepEqual(unknown, []);
  });

  test("tasks are strictly isolated by workspaceId", () => {
    const atlasTasks = getWorkspaceTasks(initialTasks, "ws-atlas-retail");
    assert.ok(atlasTasks.length > 0);
    assert.ok(atlasTasks.every((t) => t.workspaceId === "ws-atlas-retail"));

    const otherTasks = getWorkspaceTasks(initialTasks, "ws-other-tenant");
    assert.equal(otherTasks.length, 0);
  });

  test("campaigns list is strictly isolated by workspaceId", () => {
    const atlasCampaigns = getWorkspaceCampaigns(initialCampaignsList, "ws-atlas-retail");
    assert.ok(atlasCampaigns.length > 0);
    assert.ok(atlasCampaigns.every((c) => c.workspaceId === "ws-atlas-retail"));

    const unknownCampaigns = getWorkspaceCampaigns(initialCampaignsList, "ws-fake-id");
    assert.equal(unknownCampaigns.length, 0);
  });
});

describe("Workspace Scoping — Workspace Data Invariants", () => {
  test("all initial workspaces have consistent workspace name formatting", () => {
    for (const [wsId, campaigns] of Object.entries(initialCampaignFinancials)) {
      assert.ok(wsId.startsWith("ws-"), `Workspace ID ${wsId} should follow 'ws-*' convention`);
      for (const campaign of campaigns) {
        assert.ok(campaign.workspaceName.trim().length > 0, "Workspace name cannot be empty");
        assert.equal(campaign.workspaceId, wsId);
      }
    }
  });
});
