// Fixture data for screenshots and screen tests. Plain objects shaped like the
// Mealie API responses the app consumes; nothing here is real user data.
const page = <T,>(items: T[]) => ({ page: 1, per_page: 50, total: items.length, total_pages: 1, items });

const tag = (name: string) => ({ id: name, name, slug: name.toLowerCase() });
export const recipes = [
  { name: 'Salisbury Steak with Mushroom Gravy', time: '45 Minutes', cat: 'Dinner', rating: 4 },
  { name: 'Chicken Piccata', time: '30 Minutes', cat: 'Dinner', rating: 5 },
  { name: 'Tomato & Artichoke Gnocchi', time: '25 Minutes', cat: 'Dinner', rating: 4 },
  { name: 'Green Beans w/ Crispy Garlic', time: '15 Minutes', cat: 'Side', rating: 4 },
  { name: 'Instant Pot Mashed Potatoes', time: '20 Minutes', cat: 'Side', rating: 5 },
  { name: 'Carrot Cake', time: '1 Hour', cat: 'Dessert', rating: 3 },
].map((r, i) => ({
  id: `r${i}`, userId: 'u', groupId: 'g', name: r.name, slug: r.name.toLowerCase().replace(/\W+/g, '-'),
  description: 'A weeknight favourite the whole family likes.', totalTime: r.time, prepTime: '10 Minutes',
  performTime: '20 Minutes', rating: r.rating, recipeServings: 4, dateAdded: '2026-10-01',
  tags: [tag('Weeknight'), tag('Family')], recipeCategory: [tag(r.cat)], tools: [],
}));

export const recipeDetail = {
  ...recipes[0],
  recipeIngredient: [
    { referenceId: 'a', quantity: 1, unit: { name: 'lb' }, food: { name: 'ground beef' }, display: '1 lb ground beef' },
    { referenceId: 'b', quantity: 0.5, unit: { name: 'cup' }, food: { name: 'breadcrumbs' }, display: '1/2 cup breadcrumbs' },
    { referenceId: 'c', quantity: 8, unit: { name: 'oz' }, food: { name: 'mushrooms' }, display: '8 oz mushrooms, sliced' },
    { referenceId: 'd', quantity: 2, unit: { name: 'cup' }, food: { name: 'beef broth' }, display: '2 cups beef broth' },
    { referenceId: 'e', note: 'salt and pepper to taste', display: 'salt and pepper to taste' },
  ],
  recipeInstructions: [
    { id: 's1', title: '', text: 'Mix the beef, breadcrumbs, egg and seasoning, then shape into four oval patties.' },
    { id: 's2', title: '', text: 'Brown the patties in a skillet over medium-high heat, 3 minutes per side, and set aside.' },
    { id: 's3', title: 'Gravy', text: 'Cook the mushrooms in the same pan, add flour and broth, return the patties and simmer 15 minutes.' },
  ],
  notes: [{ title: 'Tip', text: 'Serve over mashed potatoes.' }],
  assets: [],
  nutrition: { calories: '420', proteinContent: '28', carbohydrateContent: '18', fatContent: '24' },
  settings: { public: false, showNutrition: true, disableComments: false, locked: false },
};

export const comments = [
  { id: 'c1', recipeId: 'r0', userId: 'u', text: 'Made this twice, kids loved it.', createdAt: '2026-10-20T18:00:00Z', user: { id: 'u', fullName: 'James', username: 'james' } },
];

export const shoppingLists = [
  { id: 'l1', groupId: 'g', householdId: 'h', name: 'Weekly Groceries', createdAt: '2026-10-26T00:00:00Z' },
  { id: 'l2', groupId: 'g', householdId: 'h', name: 'Costco Run', createdAt: '2026-10-20T00:00:00Z' },
];
const item = (id: string, display: string, checked = false, label?: string) => ({
  id, shoppingListId: 'l1', checked, position: 0, isFood: true, display, note: '',
  label: label ? { id: label, name: label, color: label === 'Produce' ? '#5BA07A' : '#E87830' } : undefined, labelId: label,
});
export const shoppingListDetail = {
  ...shoppingLists[0],
  listItems: [
    item('i1', '1 lb ground beef', false, 'Meat'), item('i2', '8 oz mushrooms', false, 'Produce'),
    item('i3', '2 cups beef broth', true, 'Pantry'), item('i4', 'Green beans', false, 'Produce'),
    item('i5', 'Yellow onions', true, 'Produce'),
  ],
  recipeReferences: [{ id: 'rr1', shoppingListId: 'l1', recipeId: 'r0', recipeQuantity: 1, recipe: recipes[0] }],
};
export const shoppingLabels = { items: [] as any[] };

export const cookbooks = [
  { id: 'c1', groupId: 'g', householdId: 'h', name: 'Weeknight Dinners', description: 'Quick meals under 45 minutes', slug: 'weeknight', position: 1, public: false, queryFilterString: '' },
  { id: 'c2', groupId: 'g', householdId: 'h', name: 'Sides & Veggies', description: '', slug: 'sides', position: 2, public: false, queryFilterString: '' },
];

export const tags = page([tag('Weeknight'), tag('Family'), tag('Quick')]);
export const categories = page([tag('Dinner'), tag('Side'), tag('Dessert')]);
export const tools = page([{ ...tag('Instant Pot'), onHand: true }, { ...tag('Skillet'), onHand: true }]);
export const foods = page([{ id: 'f1', name: 'ground beef' }, { id: 'f2', name: 'mushrooms' }]);

export const mealPlan = (dates: { mon: string; tue: string; wed: string }) => {
  const e = (id: number, date: string, entryType: string, r: typeof recipes[number]) =>
    ({ id, groupId: 'g', householdId: 'h', userId: 'u', date, entryType, title: '', text: '', recipeId: r.id, recipe: r });
  return [e(1, dates.mon, 'dinner', recipes[1]), e(2, dates.tue, 'dinner', recipes[2]),
    e(3, dates.wed, 'dinner', recipes[0]), e(4, dates.wed, 'side', recipes[3]), e(5, dates.wed, 'side', recipes[4])];
};

export const paged = page;
