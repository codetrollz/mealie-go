import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import MealPlanScreen from '../MealPlanScreen';
import { renderScreen } from '../../testing/render';
import { api } from '../../lib/mealieApi';

jest.mock('../../lib/mealieApi', () => ({
  api: { getAppAbout: jest.fn(), getMealPlans: jest.fn(), createMealPlan: jest.fn(), deleteMealPlan: jest.fn(), getRecipes: jest.fn(), getRandomRecipe: jest.fn() },
}));

const entry = (id: number, date: string, title: string, endDate?: string, entryType = 'dinner') => ({
  id, groupId: 'g', householdId: 'h', userId: 'u', date, endDate, entryType, title, text: '',
});

// Thursday 2026-10-29 00:25 UTC is Wednesday 2026-10-28 20:25 in New York:
// the evening when the local date and the UTC date differ.
const NOW = new Date('2026-10-29T00:25:00Z');

beforeEach(() => {
  jest.clearAllMocks();
  (api.getAppAbout as jest.Mock).mockResolvedValue({ version: 'v3.30.0' });
  // Fake only the clock; timers must stay real so async rendering works.
  jest.useFakeTimers({ now: NOW, doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate', 'nextTick', 'queueMicrotask'] });
  (api.getMealPlans as jest.Mock).mockResolvedValue({
    items: [entry(1, '2026-10-27', 'Tuesday dinner'), entry(2, '2026-10-28', 'Wednesday dinner')],
  });
});
afterEach(() => jest.useRealTimers());

test('a weekday shows the meals dated that day, in the evening west of UTC', async () => {
  await renderScreen(<MealPlanScreen />);
  await waitFor(() => expect(api.getMealPlans).toHaveBeenCalled());
  fireEvent.press(screen.getByText('Wed'));
  expect(await screen.findByText('Wednesday dinner')).toBeTruthy();
  expect(screen.queryByText('Tuesday dinner')).toBeNull();
});

test('opens on today, not on the first day of the week', async () => {
  // Wednesday evening in New York; the plan has meals on Tuesday and Wednesday.
  await renderScreen(<MealPlanScreen />);
  await waitFor(() => expect(api.getMealPlans).toHaveBeenCalled());
  expect(await screen.findByText('Wednesday dinner')).toBeTruthy();
  expect(screen.queryByText('Tuesday dinner')).toBeNull();
});


// The week on screen is Monday 2026-10-26 to Sunday 2026-11-01 (today is Wednesday 10-28 in New York).
describe('whole-week entries (Mealie 3.30)', () => {
  const weekEntry = (id: number, date: string, endDate: string, title: string, entryType = 'dinner') => entry(id, date, title, endDate, entryType);
  const plan = (...extra: ReturnType<typeof entry>[]) =>
    (api.getMealPlans as jest.Mock).mockResolvedValue({ items: [entry(2, '2026-10-28', 'Wednesday dinner'), ...extra] });

  test('a whole-week entry shows in its own section on every day, not under a day, and carries its meal type', async () => {
    plan(weekEntry(9, '2026-10-26', '2026-11-01', 'Soup of the week', 'lunch'));
    await renderScreen(<MealPlanScreen />);
    expect(await screen.findByText('Soup of the week')).toBeTruthy();
    expect(screen.getByText('Whole week')).toBeTruthy();
    expect(screen.getAllByText('Soup of the week')).toHaveLength(1);
    expect(screen.getAllByText('Lunch')).toHaveLength(2);                      // the section header and this entry's meal-type tag
    await fireEvent.press(screen.getByText('Fri'));
    expect(screen.getByText('Soup of the week')).toBeTruthy();                 // still there on another day
    expect(screen.queryByText('Wednesday dinner')).toBeNull();                 // day entries still follow the selected day
    expect(screen.queryByText(/Oct 2\d – /)).toBeNull();                      // exactly this week: no date label
  });

  test('an entry that runs Wednesday to Tuesday is labelled with its own dates', async () => {
    plan(weekEntry(9, '2026-10-28', '2026-11-03', 'Stew'));
    await renderScreen(<MealPlanScreen />);
    expect(await screen.findByText('Stew')).toBeTruthy();
    expect(screen.getByText('Oct 28 – Nov 3')).toBeTruthy();
  });

  test('week entries do not put a dot on any day', async () => {
    plan(weekEntry(9, '2026-10-26', '2026-11-01', 'Soup of the week'));
    (api.getMealPlans as jest.Mock).mockResolvedValue({ items: [weekEntry(9, '2026-10-26', '2026-11-01', 'Soup of the week')] });
    const { toJSON } = await renderScreen(<MealPlanScreen />);
    await screen.findByText('Soup of the week');
    // The dot is a 4x4 view; with no day entries there is none in the day strip.
    expect(JSON.stringify(toJSON())).not.toContain('"width":4,"height":4');
  });

  test('adding for the whole week saves Monday to Sunday with the chosen meal type', async () => {
    plan();
    (api.createMealPlan as jest.Mock).mockResolvedValue(weekEntry(10, '2026-10-26', '2026-11-01', 'Meal prep', 'lunch'));
    await renderScreen(<MealPlanScreen />);
    await screen.findByText('Wednesday dinner');
    await screen.findByText('Whole week');
    await fireEvent.press(screen.getAllByText('+')[0]);                              // the whole-week +, above the meal types
    expect(await screen.findByText('Whole week · Oct 26 – Nov 1')).toBeTruthy();
    await fireEvent.press(screen.getAllByText('Lunch').at(-1)!);                     // the chip in the add sheet
    await fireEvent.press(screen.getByText('Note'));
    await fireEvent.changeText(screen.getByPlaceholderText(/Leftovers/), 'Meal prep');
    await fireEvent.press(screen.getByText('Add Note'));
    await waitFor(() => expect(api.createMealPlan).toHaveBeenCalledTimes(1));
    expect(api.createMealPlan).toHaveBeenCalledWith({ date: '2026-10-26', endDate: '2026-11-01', entryType: 'lunch', title: 'Meal prep' });
    expect(await screen.findByText('Meal prep')).toBeTruthy();
  });

  test('adding to a day still saves that day without an endDate', async () => {
    plan();
    (api.createMealPlan as jest.Mock).mockResolvedValue(entry(11, '2026-10-28', 'Pancakes'));
    await renderScreen(<MealPlanScreen />);
    await screen.findByText('Wednesday dinner');
    await fireEvent.press(screen.getAllByText('+')[1]);                              // breakfast
    await fireEvent.press(screen.getByText('Note'));
    await fireEvent.changeText(screen.getByPlaceholderText(/Leftovers/), 'Pancakes');
    await fireEvent.press(screen.getByText('Add Note'));
    await waitFor(() => expect(api.createMealPlan).toHaveBeenCalledTimes(1));
    expect((api.createMealPlan as jest.Mock).mock.calls[0][0]).toEqual({ date: '2026-10-28', entryType: 'breakfast', title: 'Pancakes' });
    expect('endDate' in (api.createMealPlan as jest.Mock).mock.calls[0][0]).toBe(false);
    expect(await screen.findByText('Pancakes')).toBeTruthy();                  // added to the list, not taken back
    expect(api.deleteMealPlan).not.toHaveBeenCalled();
  });

  test('a server that drops the endDate (before 3.30) has its stray Monday entry taken back and the user told', async () => {
    plan();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (api.createMealPlan as jest.Mock).mockResolvedValue(entry(12, '2026-10-26', 'Meal prep'));   // no endDate in the reply
    (api.deleteMealPlan as jest.Mock).mockResolvedValue(undefined);
    await renderScreen(<MealPlanScreen />);
    await screen.findByText('Wednesday dinner');
    await screen.findByText('Whole week');
    await fireEvent.press(screen.getAllByText('+')[0]);
    await fireEvent.press(screen.getByText('Note'));
    await fireEvent.changeText(screen.getByPlaceholderText(/Leftovers/), 'Meal prep');
    await fireEvent.press(screen.getByText('Add Note'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Error', expect.stringContaining('3.30')));
    expect(api.deleteMealPlan).toHaveBeenCalledWith(12);
    await fireEvent.press(screen.getByText('Mon'));                            // the stray entry would be a Monday entry
    expect(screen.queryByText('Meal prep')).toBeNull();
    alert.mockRestore();
  });

  test('if taking the stray entry back fails, it is shown so it can be removed by hand', async () => {
    plan();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (api.createMealPlan as jest.Mock).mockResolvedValue(entry(12, '2026-10-26', 'Meal prep'));
    (api.deleteMealPlan as jest.Mock).mockRejectedValue(new Error('offline'));
    await renderScreen(<MealPlanScreen />);
    await screen.findByText('Wednesday dinner');
    await screen.findByText('Whole week');
    await fireEvent.press(screen.getAllByText('+')[0]);
    await fireEvent.press(screen.getByText('Note'));
    await fireEvent.changeText(screen.getByPlaceholderText(/Leftovers/), 'Meal prep');
    await fireEvent.press(screen.getByText('Add Note'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Error', expect.stringContaining('could not be removed')));
    await fireEvent.press(screen.getByText('Mon'));                            // the stray entry is a plain Monday entry
    expect(await screen.findByText('Meal prep')).toBeTruthy();
    alert.mockRestore();
  });

  test('a server that keeps the endDate gets no delete', async () => {
    plan();
    (api.createMealPlan as jest.Mock).mockResolvedValue(weekEntry(13, '2026-10-26', '2026-11-01', 'Meal prep'));
    await renderScreen(<MealPlanScreen />);
    await screen.findByText('Wednesday dinner');
    await screen.findByText('Whole week');
    await fireEvent.press(screen.getAllByText('+')[0]);
    await fireEvent.press(screen.getByText('Note'));
    await fireEvent.changeText(screen.getByPlaceholderText(/Leftovers/), 'Meal prep');
    await fireEvent.press(screen.getByText('Add Note'));
    expect(await screen.findByText('Meal prep')).toBeTruthy();
    expect(api.deleteMealPlan).not.toHaveBeenCalled();
  });

  test('a failed whole-week add alerts and keeps the sheet open', async () => {
    plan();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (api.createMealPlan as jest.Mock).mockRejectedValue(new Error('end_date must be empty or 6 days after date'));
    await renderScreen(<MealPlanScreen />);
    await screen.findByText('Wednesday dinner');
    await screen.findByText('Whole week');
    await fireEvent.press(screen.getAllByText('+')[0]);
    await fireEvent.press(screen.getByText('Note'));
    await fireEvent.changeText(screen.getByPlaceholderText(/Leftovers/), 'x');
    await fireEvent.press(screen.getByText('Add Note'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith('Error', 'end_date must be empty or 6 days after date'));
    expect(screen.getByText('Add Note')).toBeTruthy();
    alert.mockRestore();
  });

  test('removing a whole-week entry asks first, then deletes it', async () => {
    plan(weekEntry(9, '2026-10-26', '2026-11-01', 'Soup of the week'));
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (api.deleteMealPlan as jest.Mock).mockResolvedValue(undefined);
    await renderScreen(<MealPlanScreen />);
    await screen.findByText('Soup of the week');
    await fireEvent.press(screen.getAllByText('✕')[0]);                              // the week section is first
    const buttons = alert.mock.calls[0][2]!;
    await act(async () => { await buttons.find(b => b.style === 'destructive')!.onPress!(); });
    expect(api.deleteMealPlan).toHaveBeenCalledWith(9);
    await waitFor(() => expect(screen.queryByText('Soup of the week')).toBeNull());
    alert.mockRestore();
  });

  test('a server older than 3.30 gets no whole-week section, and no + for it, unless an entry exists', async () => {
    (api.getAppAbout as jest.Mock).mockResolvedValue({ version: 'v3.29.0' });
    plan();
    await renderScreen(<MealPlanScreen />);
    await screen.findByText('Wednesday dinner');
    await waitFor(() => expect(api.getAppAbout).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText('Whole week')).toBeNull());
    expect(screen.getAllByText('+')).toHaveLength(4);                          // the four meal types only
  });

  test('on a server older than 3.30 an entry that is already there is still shown, without a + to add more', async () => {
    (api.getAppAbout as jest.Mock).mockResolvedValue({ version: 'v3.29.0' });
    plan(weekEntry(9, '2026-10-26', '2026-11-01', 'Soup of the week'));
    await renderScreen(<MealPlanScreen />);
    expect(await screen.findByText('Soup of the week')).toBeTruthy();
    await waitFor(() => expect(api.getAppAbout).toHaveBeenCalled());
    await waitFor(() => expect(screen.getAllByText('+')).toHaveLength(4));
    expect(screen.getByText('Whole week')).toBeTruthy();
  });

  test('until the version lookup answers, an empty whole-week section is not drawn (no flash on an older server)', async () => {
    (api.getAppAbout as jest.Mock).mockReturnValue(new Promise(() => {}));        // never settles
    plan();
    await renderScreen(<MealPlanScreen />);
    await screen.findByText('Wednesday dinner');
    expect(screen.queryByText('Whole week')).toBeNull();
    expect(screen.getAllByText('+')).toHaveLength(4);
  });

  test('an entry that is already there is drawn without waiting for the version lookup', async () => {
    (api.getAppAbout as jest.Mock).mockReturnValue(new Promise(() => {}));
    plan(weekEntry(9, '2026-10-26', '2026-11-01', 'Soup of the week'));
    await renderScreen(<MealPlanScreen />);
    expect(await screen.findByText('Soup of the week')).toBeTruthy();
  });

  test('an unknown version or a failed version lookup keeps the whole-week section', async () => {
    (api.getAppAbout as jest.Mock).mockResolvedValue(null);
    plan();
    await renderScreen(<MealPlanScreen />);
    await screen.findByText('Wednesday dinner');
    expect(await screen.findByText('Whole week')).toBeTruthy();
    expect(screen.getAllByText('+')).toHaveLength(5);
  });
});
