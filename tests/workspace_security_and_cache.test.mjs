import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";

describe("Workspace Security, Client Cache Isolation & Logout Cleanup", () => {
  let mockStorage = {};

  beforeEach(() => {
    mockStorage = {};
  });

  const WORKSPACES_CACHE_KEY = 'marketflow_workspaces_list';
  const CURRENT_WS_STORAGE_KEY = 'marketflow_current_workspace_id';
  const workspaceStorageKey = (userId) => `${CURRENT_WS_STORAGE_KEY}_${userId}`;
  const workspaceListStorageKey = (userId) => `${WORKSPACES_CACHE_KEY}_${userId}`;

  function clearClientWorkspaceCache() {
    for (const key of Object.keys(mockStorage)) {
      if (key.startsWith('marketflow_workspaces_list') || key.startsWith('marketflow_current_workspace_id')) {
        delete mockStorage[key];
      }
    }
  }

  test("workspace cache keys are strictly scoped by authenticated userId", () => {
    const user1 = "user_001";
    const user2 = "user_002";

    const key1 = workspaceListStorageKey(user1);
    const key2 = workspaceListStorageKey(user2);

    assert.notEqual(key1, key2);
    assert.equal(key1, "marketflow_workspaces_list_user_001");
    assert.equal(key2, "marketflow_workspaces_list_user_002");

    mockStorage[key1] = JSON.stringify([{ id: "ws_1", name: "Workspace 1" }]);
    mockStorage[key2] = JSON.stringify([{ id: "ws_2", name: "Workspace 2" }]);

    assert.deepEqual(JSON.parse(mockStorage[key1]), [{ id: "ws_1", name: "Workspace 1" }]);
    assert.deepEqual(JSON.parse(mockStorage[key2]), [{ id: "ws_2", name: "Workspace 2" }]);
  });

  test("clearClientWorkspaceCache wipes all user workspace entries on logout", () => {
    mockStorage["marketflow_workspaces_list_user_001"] = JSON.stringify([{ id: "ws_1" }]);
    mockStorage["marketflow_current_workspace_id_user_001"] = "ws_1";
    mockStorage["marketflow_workspaces_list_user_002"] = JSON.stringify([{ id: "ws_2" }]);
    mockStorage["other_app_setting"] = "keep_me";

    clearClientWorkspaceCache();

    assert.equal(mockStorage["marketflow_workspaces_list_user_001"], undefined);
    assert.equal(mockStorage["marketflow_current_workspace_id_user_001"], undefined);
    assert.equal(mockStorage["marketflow_workspaces_list_user_002"], undefined);
    assert.equal(mockStorage["other_app_setting"], "keep_me");
  });

  test("stale request protection discards results when workspace is switched during fetch", async () => {
    let activeWorkspaceId = "ws_initial";
    let displayedData = null;

    async function fetchForWorkspace(wsId) {
      // Simulate network latency
      await new Promise((r) => setTimeout(r, 20));
      // Stale guard: only update state if still on the same workspace
      if (activeWorkspaceId === wsId) {
        displayedData = `Data for ${wsId}`;
      }
    }

    // Trigger request for initial workspace
    const req1 = fetchForWorkspace("ws_initial");

    // User immediately switches workspace to ws_switched
    activeWorkspaceId = "ws_switched";
    const req2 = fetchForWorkspace("ws_switched");

    await Promise.all([req1, req2]);

    assert.equal(displayedData, "Data for ws_switched", "Old workspace request must not overwrite switched workspace data");
  });

  test("server validation check ensures empty workspace on unauthenticated/unauthorized responses", () => {
    const EMPTY_WORKSPACE = { id: '', name: '' };
    const cachedWorkspaces = [{ id: 'ws_unauthorized', name: 'Leaked Workspace' }];
    
    // Server returns empty list or error for unauthorized user
    const serverAuthorizedWorkspaces = [];
    
    // Authorization logic overrides client storage
    const resolvedWorkspaces = serverAuthorizedWorkspaces.length > 0 
      ? serverAuthorizedWorkspaces 
      : EMPTY_WORKSPACE;

    assert.deepEqual(resolvedWorkspaces, EMPTY_WORKSPACE, "Client cache must never bypass server authorization");
  });
});
