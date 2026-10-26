import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import {
  defaultAppearance,
  getAppearanceStorageKey,
  loadStoredAppearance,
  resolveAppearanceTheme,
  saveStoredAppearance,
} from './settingsData.ts';

const values = new Map();

globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
};

beforeEach(() => values.clear());

test('appearance preferences are isolated by authenticated user', () => {
  const alice = { theme: 'dark', density: 'compact' };
  const bob = { theme: 'system', density: 'comfortable' };

  assert.equal(saveStoredAppearance('alice', alice), true);
  assert.equal(saveStoredAppearance('bob', bob), true);
  assert.deepEqual(loadStoredAppearance('alice'), alice);
  assert.deepEqual(loadStoredAppearance('bob'), bob);
  assert.notEqual(getAppearanceStorageKey('alice'), getAppearanceStorageKey('bob'));
});

test('appearance preferences validate stored values and default safely', () => {
  values.set(getAppearanceStorageKey('user-1'), JSON.stringify({
    theme: 'solarized',
    density: 'spacious',
  }));

  assert.deepEqual(loadStoredAppearance('user-1'), defaultAppearance);
  assert.deepEqual(loadStoredAppearance('new-user'), defaultAppearance);
});

test('appearance preferences restore System Auto and Compact selections', () => {
  assert.equal(saveStoredAppearance('user-1', { theme: 'system', density: 'compact' }), true);
  assert.deepEqual(loadStoredAppearance('user-1'), { theme: 'system', density: 'compact' });
});

test('System Auto resolves to the current operating system preference', () => {
  assert.equal(resolveAppearanceTheme('system', 'dark'), 'dark');
  assert.equal(resolveAppearanceTheme('system', 'light'), 'light');
  assert.equal(resolveAppearanceTheme('dark', 'light'), 'dark');
});
