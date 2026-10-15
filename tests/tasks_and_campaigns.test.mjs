import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { initialTasks, teamMembers } from "../src/features/tasks/tasksData.ts";
import { initialCampaignsList } from "../src/features/campaigns/campaignsData.ts";

/**
 * Task transformations & filtering logic
 */
export function deriveTaskKpis(tasks) {
  const total = tasks.length;
  const inProgress = tasks.filter(
    (t) => t.status === "In Progress" || t.status === "To Do" || t.status === "In Review"
  ).length;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const overdue = tasks.filter((t) => t.status === "Overdue").length;

  return { total, inProgress, completed, overdue };
}

export function filterTaskList(tasks, filters) {
  return tasks.filter((task) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matches =
        task.title.toLowerCase().includes(q) ||
        task.project.toLowerCase().includes(q) ||
        task.description.toLowerCase().includes(q);
      if (!matches) return false;
    }

    if (filters.assignee && filters.assignee !== "All" && task.assignee.name !== filters.assignee) {
      return false;
    }

    if (filters.priority && filters.priority !== "All" && task.priority !== filters.priority) {
      return false;
    }

    if (filters.status && filters.status !== "All" && task.status !== filters.status) {
      return false;
    }

    if (filters.kpi) {
      if (filters.kpi === "In Progress") {
        if (!["In Progress", "To Do", "In Review"].includes(task.status)) {
          return false;
        }
      } else if (task.status !== filters.kpi) {
        return false;
      }
    }

    return true;
  });
}

export function computeChecklistProgress(checklist) {
  if (!checklist || checklist.length === 0) {
    return { completedCount: 0, totalCount: 0, percentage: 0 };
  }
  const completedCount = checklist.filter((item) => item.completed).length;
  const totalCount = checklist.length;
  const percentage = Math.round((completedCount / totalCount) * 100);
  return { completedCount, totalCount, percentage };
}

/**
 * Campaign transformations & metrics
 */
export function filterCampaignsByWorkspace(campaigns, workspaceId) {
  return campaigns.filter((c) => c.workspaceId === workspaceId);
}

export function computeCampaignMetrics(campaign) {
  const adBudget = campaign.adBudget || 0;
  const adSpend = campaign.adSpend || 0;
  const revenue = campaign.revenue || 0;
  const leads = campaign.leads || 0;
  const customers = campaign.acquiredCustomers || 0;

  const budgetUtilization = adBudget > 0 ? (adSpend / adBudget) * 100 : 0;
  const roas = adSpend > 0 ? revenue / adSpend : 0;
  const costPerLead = leads > 0 ? adSpend / leads : 0;
  const customerAcquisitionCost = customers > 0 ? adSpend / customers : 0;

  return {
    budgetUtilization: Math.round(budgetUtilization),
    roas: Math.round(roas * 100) / 100,
    costPerLead: Math.round(costPerLead * 100) / 100,
    customerAcquisitionCost: Math.round(customerAcquisitionCost * 100) / 100,
  };
}

describe("Tasks & Workflow — KPI Count Derivation", () => {
  test("derives correct task KPI totals for initial tasks dataset", () => {
    const kpis = deriveTaskKpis(initialTasks);
    assert.equal(kpis.total, initialTasks.length);
    assert.ok(kpis.total > 0, "Tasks array should not be empty");
    assert.equal(kpis.inProgress + kpis.completed + kpis.overdue, kpis.total);
  });

  test("derives correct KPIs for empty task list", () => {
    const kpis = deriveTaskKpis([]);
    assert.deepEqual(kpis, { total: 0, inProgress: 0, completed: 0, overdue: 0 });
  });
});

describe("Tasks & Workflow — Filtering Logic", () => {
  test("filters tasks by search query matching title or project", () => {
    const results = filterTaskList(initialTasks, { search: "creative" });
    assert.ok(results.length > 0);
    assert.ok(results.every((t) => t.title.toLowerCase().includes("creative") || t.project.toLowerCase().includes("creative") || t.description.toLowerCase().includes("creative")));
  });

  test("filters tasks by assignee name", () => {
    const sara = teamMembers[0].name;
    const results = filterTaskList(initialTasks, { assignee: sara });
    assert.ok(results.length > 0);
    assert.ok(results.every((t) => t.assignee.name === sara));
  });

  test("filters tasks by priority", () => {
    const highPriority = filterTaskList(initialTasks, { priority: "High" });
    assert.ok(highPriority.length > 0);
    assert.ok(highPriority.every((t) => t.priority === "High"));
  });

  test("filters tasks by KPI status card", () => {
    const completedTasks = filterTaskList(initialTasks, { kpi: "Completed" });
    assert.ok(completedTasks.every((t) => t.status === "Completed"));

    const inProgressTasks = filterTaskList(initialTasks, { kpi: "In Progress" });
    assert.ok(inProgressTasks.every((t) => ["In Progress", "To Do", "In Review"].includes(t.status)));
  });
});

describe("Tasks & Workflow — Checklist Progress Calculations", () => {
  test("computes checklist progress accurately", () => {
    const checklist = [
      { id: "1", text: "Task A", completed: true },
      { id: "2", text: "Task B", completed: true },
      { id: "3", text: "Task C", completed: false },
      { id: "4", text: "Task D", completed: false },
    ];
    const progress = computeChecklistProgress(checklist);
    assert.equal(progress.completedCount, 2);
    assert.equal(progress.totalCount, 4);
    assert.equal(progress.percentage, 50);
  });

  test("handles empty checklist safely without division by zero", () => {
    const progress = computeChecklistProgress([]);
    assert.equal(progress.completedCount, 0);
    assert.equal(progress.totalCount, 0);
    assert.equal(progress.percentage, 0);
  });

  test("handles 100% completed checklist", () => {
    const checklist = [
      { id: "1", text: "Done 1", completed: true },
      { id: "2", text: "Done 2", completed: true },
    ];
    const progress = computeChecklistProgress(checklist);
    assert.equal(progress.percentage, 100);
  });
});

describe("Campaigns — Filtering & Performance Calculations", () => {
  test("filters campaigns by workspaceId", () => {
    const atlasCampaigns = filterCampaignsByWorkspace(initialCampaignsList, "ws-atlas-retail");
    assert.ok(atlasCampaigns.length > 0);
    assert.ok(atlasCampaigns.every((c) => c.workspaceId === "ws-atlas-retail"));
  });

  test("computes accurate performance metrics for Autumn Launch 2026", () => {
    const autumn = initialCampaignsList.find((c) => c.id === "autumn-launch-2026");
    assert.ok(autumn, "Autumn launch campaign must exist");

    const metrics = computeCampaignMetrics(autumn);
    // adBudget: 7500, adSpend: 5400 => utilization: 72%
    assert.equal(metrics.budgetUtilization, 72);
    // revenue: 13400, adSpend: 5400 => roas: 2.48
    assert.equal(metrics.roas, 2.48);
    // leads: 180, adSpend: 5400 => cpl: 30
    assert.equal(metrics.costPerLead, 30);
    // customers: 60, adSpend: 5400 => cac: 90
    assert.equal(metrics.customerAcquisitionCost, 90);
  });

  test("handles planned campaign with 0 ad spend safely", () => {
    const retargeting = initialCampaignsList.find((c) => c.id === "october-retargeting");
    assert.ok(retargeting);
    const metrics = computeCampaignMetrics(retargeting);
    assert.equal(metrics.budgetUtilization, 0);
    assert.equal(metrics.roas, 0);
    assert.equal(metrics.costPerLead, 0);
    assert.equal(metrics.customerAcquisitionCost, 0);
  });
});
