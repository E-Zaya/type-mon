import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * false during server rendering and hydration, true afterwards.
 * Lets a component render a stable placeholder until it can read browser
 * state (localStorage, matchMedia) without a setState inside an effect.
 */
export function useClientMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
