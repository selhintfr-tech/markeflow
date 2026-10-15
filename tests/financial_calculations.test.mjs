import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { initialCampaignFinancials } from "../src/features/finance/profitabilityData.ts";

/**
 * Pure domain financial calculation helper functions
 * mirroring MarketFlow implementation in ProfitabilityPage and BudgetExpensesPage
 */
export function calculateCampaignTotals(financials) {
  const salesRevenue = financials.salesRevenue || 0;
  const advertisingSpend = financials.advertisingSpend || 0;
  const costOfGoodsSold = financials.costOfGoodsSold || 0;
  const otherAllocatedExpenses = financials.otherAllocatedExpenses || 0;

  const totalRecordedCosts = advertisingSpend + costOfGoodsSold + otherAllocatedExpenses;
  const netProfit = salesRevenue - totalRecordedCosts;
  const profitMargin = salesRevenue > 0 ? (netProfit / salesRevenue) * 100 : 0;
  const roas = advertisingSpend > 0 ? salesRevenue / advertisingSpend : 0;

  const adSpendShare = totalRecordedCosts > 0 ? (advertisingSpend / totalRecordedCosts) * 100 : 0;
  const cogsShare = totalRecordedCosts > 0 ? (costOfGoodsSold / totalRecordedCosts) * 100 : 0;
  const otherShare = totalRecordedCosts > 0 ? (otherAllocatedExpenses / totalRecordedCosts) * 100 : 0;

  return {
    salesRevenue,
    advertisingSpend,
    costOfGoodsSold,
    otherAllocatedExpenses,
    totalRecordedCosts,
    netProfit,
    profitMargin,
    roas,
    adSpendShare,
    cogsShare,
    otherShare,
  };
}

export function calculateBudgetUtilization(plannedBudget, actualSpend) {
  const remainingBudget = plannedBudget - actualSpend;
  const budgetUtilization = plannedBudget > 0 ? Math.round((actualSpend / plannedBudget) * 100) : 0;
  return {
    remainingBudget,
    budgetUtilization,
  };
}

describe("Financial Calculations — Profitability Engine", () => {
  test("calculates positive net profit for profitable campaigns", () => {
    const input = {
      salesRevenue: 13400,
      advertisingSpend: 5400,
      costOfGoodsSold: 4600,
      otherAllocatedExpenses: 1200,
    };
    const result = calculateCampaignTotals(input);
    assert.equal(result.totalRecordedCosts, 11200);
    assert.equal(result.netProfit, 2200);
    assert.equal(Number(result.profitMargin.toFixed(2)), 16.42);
    assert.equal(Number(result.roas.toFixed(2)), 2.48);
  });

  test("calculates negative net profit and negative margin when costs exceed revenue", () => {
    const input = {
      salesRevenue: 5000,
      advertisingSpend: 4000,
      costOfGoodsSold: 2000,
      otherAllocatedExpenses: 1000,
    };
    const result = calculateCampaignTotals(input);
    assert.equal(result.totalRecordedCosts, 7000);
    assert.equal(result.netProfit, -2000);
    assert.equal(result.profitMargin, -40);
    assert.equal(result.roas, 1.25);
  });

  test("handles break-even campaign (0 net profit)", () => {
    const input = {
      salesRevenue: 10000,
      advertisingSpend: 4000,
      costOfGoodsSold: 4000,
      otherAllocatedExpenses: 2000,
    };
    const result = calculateCampaignTotals(input);
    assert.equal(result.netProfit, 0);
    assert.equal(result.profitMargin, 0);
  });

  test("guarantees division by zero safety when sales revenue is zero", () => {
    const input = {
      salesRevenue: 0,
      advertisingSpend: 1500,
      costOfGoodsSold: 500,
      otherAllocatedExpenses: 200,
    };
    const result = calculateCampaignTotals(input);
    assert.equal(result.netProfit, -2200);
    assert.equal(result.profitMargin, 0); // Must be 0, not NaN or -Infinity
    assert.equal(Number.isFinite(result.profitMargin), true);
  });

  test("guarantees division by zero safety when advertising spend is zero", () => {
    const input = {
      salesRevenue: 8000,
      advertisingSpend: 0,
      costOfGoodsSold: 3000,
      otherAllocatedExpenses: 500,
    };
    const result = calculateCampaignTotals(input);
    assert.equal(result.roas, 0); // Must be 0, not Infinity
    assert.equal(Number.isFinite(result.roas), true);
  });

  test("guarantees totalRecordedCosts zero safety for expense shares", () => {
    const input = {
      salesRevenue: 0,
      advertisingSpend: 0,
      costOfGoodsSold: 0,
      otherAllocatedExpenses: 0,
    };
    const result = calculateCampaignTotals(input);
    assert.equal(result.totalRecordedCosts, 0);
    assert.equal(result.adSpendShare, 0);
    assert.equal(result.cogsShare, 0);
    assert.equal(result.otherShare, 0);
    assert.equal(result.profitMargin, 0);
    assert.equal(result.roas, 0);
  });

  test("cost breakdown shares sum to 100% when costs exist", () => {
    const input = {
      salesRevenue: 20000,
      advertisingSpend: 5000,
      costOfGoodsSold: 3000,
      otherAllocatedExpenses: 2000,
    };
    const result = calculateCampaignTotals(input);
    const sumShares = result.adSpendShare + result.cogsShare + result.otherShare;
    assert.equal(Math.round(sumShares), 100);
    assert.equal(result.adSpendShare, 50);
    assert.equal(result.cogsShare, 30);
    assert.equal(result.otherShare, 20);
  });
});

describe("Financial Calculations — Budget Utilization", () => {
  test("computes remaining budget and utilization correctly within budget", () => {
    const result = calculateBudgetUtilization(7500, 5400);
    assert.equal(result.remainingBudget, 2100);
    assert.equal(result.budgetUtilization, 72);
  });

  test("computes remaining budget and utilization correctly when over budget", () => {
    const result = calculateBudgetUtilization(5000, 6000);
    assert.equal(result.remainingBudget, -1000);
    assert.equal(result.budgetUtilization, 120);
  });

  test("handles zero planned budget gracefully without division by zero crash", () => {
    const result = calculateBudgetUtilization(0, 500);
    assert.equal(result.remainingBudget, -500);
    assert.equal(result.budgetUtilization, 0);
    assert.equal(Number.isFinite(result.budgetUtilization), true);
  });
});

describe("Financial Calculations — Application Initial Financials Integrity", () => {
  test("initialCampaignFinancials contains data for required workspaces", () => {
    const expectedWorkspaces = ["ws-atlas-retail", "ws-solis-energy", "ws-nordic-craft", "ws-zenith-media"];
    for (const wsId of expectedWorkspaces) {
      assert.ok(initialCampaignFinancials[wsId], `Workspace ${wsId} should exist in initial financials`);
      assert.ok(initialCampaignFinancials[wsId].length > 0, `Workspace ${wsId} should have at least 1 campaign`);
    }
  });

  test("all initial campaigns satisfy financial arithmetic invariants", () => {
    for (const [wsId, campaigns] of Object.entries(initialCampaignFinancials)) {
      for (const campaign of campaigns) {
        assert.ok(campaign.salesRevenue >= 0, `Campaign ${campaign.campaignName} revenue must be non-negative`);
        assert.ok(campaign.advertisingSpend >= 0, `Campaign ${campaign.campaignName} adSpend must be non-negative`);
        assert.ok(campaign.costOfGoodsSold >= 0, `Campaign ${campaign.campaignName} COGS must be non-negative`);
        assert.ok(campaign.otherAllocatedExpenses >= 0, `Campaign ${campaign.campaignName} other expenses must be non-negative`);
        assert.equal(campaign.workspaceId, wsId, `Campaign ${campaign.campaignName} workspaceId must match dictionary key`);

        const computed = calculateCampaignTotals(campaign);
        assert.ok(Number.isFinite(computed.profitMargin), "Profit margin must be a finite number");
        assert.ok(Number.isFinite(computed.roas), "ROAS must be a finite number");
      }
    }
  });

  test("verifies Atlas Retail 'Autumn Launch 2026' specific baseline figures", () => {
    const atlasCampaigns = initialCampaignFinancials["ws-atlas-retail"];
    const autumn = atlasCampaigns.find((c) => c.campaignId === "camp-1");
    assert.ok(autumn, "Autumn Launch 2026 campaign must exist");
    assert.equal(autumn.salesRevenue, 13400);
    assert.equal(autumn.advertisingSpend, 5400);
    assert.equal(autumn.costOfGoodsSold, 4600);
    assert.equal(autumn.otherAllocatedExpenses, 1200);

    const totals = calculateCampaignTotals(autumn);
    assert.equal(totals.totalRecordedCosts, 11200);
    assert.equal(totals.netProfit, 2200);
    assert.equal(Math.round(totals.profitMargin), 16);
    assert.equal(Math.round(totals.roas * 100) / 100, 2.48);
  });
});
