import { useMemo } from 'react';
import { I18nManager } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';

/** A swipe must be long enough and clearly more sideways than up/down, so scrolling never flips a tab. */
export const SWIPE_MIN_DISTANCE = 60;
export const SWIPE_HORIZONTAL_RATIO = 1.8;
/**
 * The pan only starts after 20dp sideways and gives up after 15dp up or down, so a vertical drag
 * is left to the page's ScrollView and a deliberate sideways one is not stolen by it. (A plain
 * touch observer loses slightly diagonal swipes: the ScrollView takes the touch after ~8dp
 * vertical drift and the swipe is cancelled.)
 */
export const SWIPE_ACTIVATE_X = 20;
export const SWIPE_FAIL_Y = 15;

/**
 * The tab a swipe leads to, or null if it is not a tab swipe or there is no tab that way.
 * Swiping left (dx < 0) moves to the next tab, right to the previous one; the ends do not wrap.
 * In a right-to-left layout the directions are mirrored.
 */
export function swipeTarget<T>(tabs: readonly T[], active: T, dx: number, dy: number, rtl = false): T | null {
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * SWIPE_HORIZONTAL_RATIO) return null;
  const at = tabs.indexOf(active);
  if (at < 0) return null;
  const forward = rtl ? dx > 0 : dx < 0;
  const next = at + (forward ? 1 : -1);
  return next >= 0 && next < tabs.length ? tabs[next] : null;
}

/** Pan gesture that switches tabs on a horizontal swipe; wrap the tab area in a GestureDetector. */
export function useTabSwipe<T>(tabs: readonly T[], active: T, setActive: (tab: T) => void, testID?: string) {
  return useMemo(() => {
    let gesture = Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-SWIPE_ACTIVATE_X, SWIPE_ACTIVATE_X])
      .failOffsetY([-SWIPE_FAIL_Y, SWIPE_FAIL_Y])
      .onEnd(e => {
        const target = swipeTarget(tabs, active, e.translationX, e.translationY, I18nManager.isRTL);
        if (target !== null) setActive(target);
      });
    if (testID) gesture = gesture.withTestId(testID);
    return gesture;
  }, [tabs, active, setActive, testID]);
}
