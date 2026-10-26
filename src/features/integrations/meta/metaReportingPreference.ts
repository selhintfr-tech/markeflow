export const META_REPORTING_PERIODS = [
  'last_7d',
  'last_30d',
  'this_month',
  'last_month',
  'maximum',
] as const;

export type MetaReportingPeriod = (typeof META_REPORTING_PERIODS)[number];

export const DEFAULT_META_REPORTING_PERIOD: MetaReportingPeriod = 'maximum';

type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function isMetaReportingPeriod(value: string): value is MetaReportingPeriod {
  return META_REPORTING_PERIODS.some((period) => period === value);
}

function preferenceKey(userId: string, workspaceId: string, accountId: string): string {
  return `marketflow_meta_reporting_period:${encodeURIComponent(userId)}:${encodeURIComponent(workspaceId)}:${encodeURIComponent(accountId)}`;
}

export function loadMetaReportingPreference(
  storage: PreferenceStorage,
  userId: string,
  workspaceId: string,
  accountId: string,
): MetaReportingPeriod {
  if (!userId || !workspaceId || !accountId) return DEFAULT_META_REPORTING_PERIOD;

  try {
    const value = storage.getItem(preferenceKey(userId, workspaceId, accountId));
    return value && isMetaReportingPeriod(value) ? value : DEFAULT_META_REPORTING_PERIOD;
  } catch {
    return DEFAULT_META_REPORTING_PERIOD;
  }
}

export function saveMetaReportingPreference(
  storage: PreferenceStorage,
  userId: string,
  workspaceId: string,
  accountId: string,
  period: MetaReportingPeriod,
): void {
  if (!userId || !workspaceId || !accountId) return;
  storage.setItem(preferenceKey(userId, workspaceId, accountId), period);
}
