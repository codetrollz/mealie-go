// Mealie 3.30 added week-long meal plan entries (an optional `endDate` on a plan entry).
const WEEK_ENTRIES_MIN = [3, 30];

// False only when the server version parses and is older than 3.30. An unknown version (a nightly build, a failed
// lookup) shows the feature rather than silently removing it; a server that really lacks it answers with its own error.
export function supportsWeekEntries(version?: string | null): boolean {
  const match = /^v?(\d+)\.(\d+)/.exec((version ?? '').trim());
  if (!match) return true;
  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  return major > WEEK_ENTRIES_MIN[0] || (major === WEEK_ENTRIES_MIN[0] && minor >= WEEK_ENTRIES_MIN[1]);
}
