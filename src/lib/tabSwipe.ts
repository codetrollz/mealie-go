import { useRef } from 'react';
import type { GestureResponderEvent } from 'react-native';

/** A swipe must be long enough and clearly more sideways than up/down, so scrolling never flips a tab. */
export const SWIPE_MIN_DISTANCE = 60;
export const SWIPE_HORIZONTAL_RATIO = 1.8;

/**
 * The tab a swipe leads to, or null if it is not a tab swipe or there is no tab that way.
 * Swiping left (dx < 0) moves to the next tab, right to the previous one; the ends do not wrap.
 */
export function swipeTarget<T>(tabs: readonly T[], active: T, dx: number, dy: number): T | null {
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * SWIPE_HORIZONTAL_RATIO) return null;
  const at = tabs.indexOf(active);
  if (at < 0) return null;
  const next = at + (dx < 0 ? 1 : -1);
  return next >= 0 && next < tabs.length ? tabs[next] : null;
}

/**
 * Touch handlers that switch tabs on a horizontal swipe. They only observe the touches (no
 * responder is claimed), so vertical scrolling and taps on the content work exactly as before.
 */
export function useTabSwipe<T>(tabs: readonly T[], active: T, setActive: (tab: T) => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (e: GestureResponderEvent) => {
      const { pageX, pageY, touches } = e.nativeEvent;
      // A second finger (pinch/zoom) cancels the swipe.
      start.current = touches && touches.length > 1 ? null : { x: pageX, y: pageY };
    },
    onTouchEnd: (e: GestureResponderEvent) => {
      const from = start.current;
      start.current = null;
      if (!from) return;
      const target = swipeTarget(tabs, active, e.nativeEvent.pageX - from.x, e.nativeEvent.pageY - from.y);
      if (target !== null) setActive(target);
    },
    onTouchCancel: () => { start.current = null; },
  };
}
