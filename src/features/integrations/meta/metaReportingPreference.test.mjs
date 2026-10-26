import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_META_REPORTING_PERIOD,
  loadMetaReportingPreference,
  saveMetaReportingPreference,
} from './metaReportingPreference.ts';

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test('defaults to Maximum available when no period has been saved', () => {
  assert.equal(
    loadMetaReportingPreference(createStorage(), 'user-1', 'workspace-1', 'act_1'),
    DEFAULT_META_REPORTING_PERIOD,
  );
});

test('persists and restores a period only for the matching user, workspace, and ad account', () => {
  const storage = createStorage();
  saveMetaReportingPreference(storage, 'user-1', 'workspace-1', 'act_1', 'last_30d');

  assert.equal(loadMetaReportingPreference(storage, 'user-1', 'workspace-1', 'act_1'), 'last_30d');
  assert.equal(loadMetaReportingPreference(storage, 'user-2', 'workspace-1', 'act_1'), 'maximum');
  assert.equal(loadMetaReportingPreference(storage, 'user-1', 'workspace-2', 'act_1'), 'maximum');
  assert.equal(loadMetaReportingPreference(storage, 'user-1', 'workspace-1', 'act_2'), 'maximum');
});

test('ignores a stored period that is not a supported Meta reporting preset', () => {
  const storage = createStorage();
  storage.setItem('marketflow_meta_reporting_period:user-1:workspace-1:act_1', 'unsupported');

  assert.equal(loadMetaReportingPreference(storage, 'user-1', 'workspace-1', 'act_1'), 'maximum');
});
