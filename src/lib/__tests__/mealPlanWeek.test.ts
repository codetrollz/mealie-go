import { isWeekEntry, splitWeekEntries, startsInRange, weekEntryRange } from '../mealPlanWeek';
import type { MealPlanEntry } from '../../types';

const e = (id: number, date: string, endDate?: string | null): MealPlanEntry => ({
  id, groupId: 'g', householdId: 'h', userId: 'u', date, endDate, entryType: 'dinner', title: 't' + id,
});

test('an entry with an endDate is a week entry; null, missing and empty are day entries', () => {
  expect(isWeekEntry(e(1, '2026-11-09', '2026-11-15'))).toBe(true);
  expect(isWeekEntry(e(2, '2026-11-09', null))).toBe(false);
  expect(isWeekEntry(e(3, '2026-11-09'))).toBe(false);
  expect(isWeekEntry(e(4, '2026-11-09', ''))).toBe(false);
});

test('splitWeekEntries keeps the order and loses nothing', () => {
  const all = [e(1, '2026-11-09', '2026-11-15'), e(2, '2026-11-10'), e(3, '2026-11-11', null), e(4, '2026-11-12', '2026-11-18')];
  const { week, day } = splitWeekEntries(all);
  expect(week.map(x => x.id)).toEqual([1, 4]);
  expect(day.map(x => x.id)).toEqual([2, 3]);
});

describe('startsInRange (shopping lists: only the range holding the start date adds a week entry)', () => {
  const range = ['2026-11-09', '2026-11-15'] as const;
  test('a day entry always passes: the server already filtered it by date', () => {
    expect(startsInRange(e(1, '2026-11-12'), ...range)).toBe(true);
    expect(startsInRange(e(2, '2026-11-12', null), ...range)).toBe(true);
  });
  test('a week entry starting inside the range passes, on both edges', () => {
    expect(startsInRange(e(1, '2026-11-09', '2026-11-15'), ...range)).toBe(true);
    expect(startsInRange(e(2, '2026-11-15', '2026-11-21'), ...range)).toBe(true);
  });
  test('a week entry that only overlaps the range does not', () => {
    expect(startsInRange(e(1, '2026-11-04', '2026-11-10'), ...range)).toBe(false);   // started last week
    expect(startsInRange(e(2, '2026-11-16', '2026-11-22'), ...range)).toBe(false);   // starts after
  });
});

describe('weekEntryRange (label for entries that are not exactly the Monday-Sunday week on screen)', () => {
  test('exactly that week: no label', () => {
    expect(weekEntryRange(e(1, '2026-11-09', '2026-11-15'), '2026-11-09', '2026-11-15')).toBeNull();
  });
  test('a Wed-Tue entry seen from either week it touches is labelled with its own dates', () => {
    const wed = e(1, '2026-11-11', '2026-11-17');
    expect(weekEntryRange(wed, '2026-11-09', '2026-11-15')).toEqual({ from: '2026-11-11', to: '2026-11-17' });
    expect(weekEntryRange(wed, '2026-11-16', '2026-11-22')).toEqual({ from: '2026-11-11', to: '2026-11-17' });
  });
  test('a day entry has no range', () => {
    expect(weekEntryRange(e(1, '2026-11-09'), '2026-11-09', '2026-11-15')).toBeNull();
  });
});
