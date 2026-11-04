import type { MealPlanEntry } from '../types';

// Mealie 3.30 week-long entries carry an `endDate` six days after `date`. The server returns every one that merely
// overlaps the range it was asked for, so what counts as "in" a week depends on the use:
//   - showing the plan: any overlap is shown (it is true that the entry covers that week);
//   - shopping lists: only the range holding the entry's start date adds it, so two ranges never both add it.

// Mealie before 3.30 accepts an `endDate` on a new plan entry and silently drops it (probed on 3.29: 201, no endDate
// in the reply), leaving a plain entry on the start day. Raised when a whole-week add comes back without its endDate.
export class WeekEntriesUnsupportedError extends Error {
  constructor() {
    super('This Mealie server does not support whole-week entries');
    this.name = 'WeekEntriesUnsupportedError';
  }
}

export function isWeekEntry(entry: MealPlanEntry): boolean {
  return !!entry.endDate;
}

export function splitWeekEntries(entries: MealPlanEntry[]): { week: MealPlanEntry[]; day: MealPlanEntry[] } {
  return {
    week: entries.filter(isWeekEntry),
    day: entries.filter(e => !isWeekEntry(e)),
  };
}

// True for a day entry (the server already filtered those by date) and for a week entry whose start date is in
// [start, end] (ISO dates compare as strings).
export function startsInRange(entry: MealPlanEntry, start: string, end: string): boolean {
  return !isWeekEntry(entry) || (entry.date >= start && entry.date <= end);
}

// The range an entry covers when it is not exactly the Monday-Sunday week on screen, e.g. a Wed-Tue entry; null when
// it is exactly that week (no label needed).
export function weekEntryRange(entry: MealPlanEntry, weekStart: string, weekEnd: string): { from: string; to: string } | null {
  if (!entry.endDate) return null;
  if (entry.date === weekStart && entry.endDate === weekEnd) return null;
  return { from: entry.date, to: entry.endDate };
}
