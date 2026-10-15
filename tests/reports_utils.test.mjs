import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  formatDate,
  formatCurrency,
  filterReports,
  getUniqueCompanies,
  generateCSV
} from "../src/features/reports/utils.ts";

describe("Reports Utilities — Date and Currency Formatting", () => {
  test("formatDate formats valid ISO dates to UK localized string", () => {
    assert.equal(formatDate("2026-10-15"), "15 Oct 2026");
    assert.equal(formatDate("2026-01-01"), "01 Jan 2026");
    assert.equal(formatDate("2026-12-31"), "31 Dec 2026");
    assert.equal(formatDate("2024-02-29"), "29 Feb 2024"); // Leap year
  });

  test("formatCurrency formats amounts into Moroccan Dirham string", () => {
    assert.equal(formatCurrency(5400), "5,400 MAD");
    assert.equal(formatCurrency(0), "0 MAD");
    assert.equal(formatCurrency(1250000), "1,250,000 MAD");
  });
});

describe("Reports Utilities — Report Filtering Logic", () => {
  const sampleReports = [
    {
      id: "rep-1",
      name: "Q3 Performance Review",
      type: "Executive Summary",
      company: "Atlas Retail SARL",
      reportingPeriod: "Q3 2026",
      status: "Published",
      createdBy: "Sara El Amrani",
      createdDate: "2026-10-01",
      workspaceId: "ws-atlas-retail"
    },
    {
      id: "rep-2",
      name: "Social Media ROI Deep Dive",
      type: "Campaign Performance",
      company: "Atlas Retail SARL",
      reportingPeriod: "Sep 2026",
      status: "Draft",
      createdBy: "Mehdi Zahraoui",
      createdDate: "2026-10-05",
      workspaceId: "ws-atlas-retail"
    },
    {
      id: "rep-3",
      name: "Q3 Solar Tech Analysis",
      type: "Executive Summary",
      company: "Solis Energy",
      reportingPeriod: "Q3 2026",
      status: "Published",
      createdBy: "Karim Tazi",
      createdDate: "2026-10-02",
      workspaceId: "ws-solis-energy"
    }
  ];

  test("filterReports matches search query case-insensitively", () => {
    const filters = { search: "performance", company: "All companies", status: "All" };
    const results = filterReports(sampleReports, filters, "ws-atlas-retail");
    assert.equal(results.length, 1);
    assert.equal(results[0].id, "rep-1");
  });

  test("filterReports filters by company accurately", () => {
    const filters = { search: "", company: "Atlas Retail SARL", status: "All" };
    const results = filterReports(sampleReports, filters, "ws-atlas-retail");
    assert.equal(results.length, 2);
  });

  test("filterReports filters by status accurately", () => {
    const filters = { search: "", company: "All companies", status: "Draft" };
    const results = filterReports(sampleReports, filters, "ws-atlas-retail");
    assert.equal(results.length, 1);
    assert.equal(results[0].id, "rep-2");
  });

  test("filterReports strictly enforces workspace isolation", () => {
    // Solis Energy report has Q3 in name, but workspace is ws-atlas-retail
    const filters = { search: "Q3", company: "All companies", status: "All" };
    const resultsAtlas = filterReports(sampleReports, filters, "ws-atlas-retail");
    assert.equal(resultsAtlas.length, 1);
    assert.equal(resultsAtlas[0].workspaceId, "ws-atlas-retail");

    // When querying for Solis Energy workspace
    const resultsSolis = filterReports(sampleReports, filters, "ws-solis-energy");
    assert.equal(resultsSolis.length, 1);
    assert.equal(resultsSolis[0].workspaceId, "ws-solis-energy");
  });

  test("filterReports returns empty array when no report matches all filters", () => {
    const filters = { search: "NonExistentKeyword", company: "All companies", status: "All" };
    const results = filterReports(sampleReports, filters, "ws-atlas-retail");
    assert.equal(results.length, 0);
  });
});

describe("Reports Utilities — Company Aggregation", () => {
  test("getUniqueCompanies extracts distinct companies prepended with 'All companies'", () => {
    const reports = [
      { company: "Company Alpha" },
      { company: "Company Beta" },
      { company: "Company Alpha" }
    ];
    const unique = getUniqueCompanies(reports);
    assert.deepEqual(unique, ["All companies", "Company Alpha", "Company Beta"]);
  });

  test("getUniqueCompanies handles empty report array", () => {
    const unique = getUniqueCompanies([]);
    assert.deepEqual(unique, ["All companies"]);
  });
});

describe("Reports Utilities — CSV Export Generation", () => {
  test("generateCSV outputs structured CSV with metadata and metrics", () => {
    const report = {
      id: "rep-10",
      name: "October Campaign Audit",
      type: "Audit",
      company: "Atlas Retail SARL",
      reportingPeriod: "October 2026",
      status: "Final",
      createdBy: "Sara El Amrani",
      createdDate: "2026-10-15",
      workspaceId: "ws-atlas-retail",
      metrics: {
        adSpend: 5400,
        leads: 180,
        revenue: 13400,
        estimatedProfit: 2200
      },
      channelPerformance: [
        { channel: "Meta Ads", value: 3400 },
        { channel: "Google Ads", value: 2000 }
      ],
      keyTakeaways: [
        "Strong conversion rate on Instagram carousel ads.",
        "Cost per lead decreased by 14%."
      ]
    };

    const csv = generateCSV(report);
    assert.ok(csv.startsWith("Metric,Value"));
    assert.ok(csv.includes('"Report Name","October Campaign Audit"'));
    assert.ok(csv.includes('"Company","Atlas Retail SARL"'));
    assert.ok(csv.includes('"Ad Spend","5400 MAD"'));
    assert.ok(csv.includes('"Revenue","13400 MAD"'));
    assert.ok(csv.includes('"Meta Ads","3400"'));
    assert.ok(csv.includes('"Google Ads","2000"'));
    assert.ok(csv.includes('"1","Strong conversion rate on Instagram carousel ads."'));
  });

  test("generateCSV handles reports without optional metrics gracefully", () => {
    const report = {
      id: "rep-11",
      name: "Summary Only",
      type: "Summary",
      company: "Atlas Retail SARL",
      reportingPeriod: "Q4",
      status: "Draft",
      createdBy: "Sara El Amrani",
      createdDate: "2026-10-15",
      workspaceId: "ws-atlas-retail"
    };

    const csv = generateCSV(report);
    assert.ok(csv.includes('"Report Name","Summary Only"'));
    assert.equal(csv.includes("Metrics"), false);
  });
});
