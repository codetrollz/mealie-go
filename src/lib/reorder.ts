/**
 * A copy of `list` with the item at `from` moved to index `to`. Out-of-range or no-op moves
 * return the same array instance, so a state setter given the result doesn't re-render.
 */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
