/**
 * Tiny typed event bus replacing the web's window CustomEvents (ptw:spotsaved,
 * ptw:alertsenabled, ptw:enablealerts, ptw:conditionsinterest, ptw:drawerchange).
 * Same purpose: decouple the enrollment prompt's triggers from the screen state.
 */
type Events = {
  spotsaved: { spotName: string };
  alertsenabled: void;
  enablealerts: void;
  conditionsinterest: void;
  drawerchange: { open: boolean };
};

type Listener<K extends keyof Events> = (payload: Events[K]) => void;

const listeners = new Map<keyof Events, Set<Listener<never>>>();

export function on<K extends keyof Events>(event: K, fn: Listener<K>): () => void {
  let set = listeners.get(event);
  if (!set) {
    set = new Set();
    listeners.set(event, set);
  }
  set.add(fn as Listener<never>);
  return () => {
    set?.delete(fn as Listener<never>);
  };
}

export function emit<K extends keyof Events>(
  event: K,
  ...payload: Events[K] extends void ? [] : [Events[K]]
): void {
  const set = listeners.get(event);
  if (!set) return;
  for (const fn of [...set]) {
    (fn as Listener<K>)(payload[0] as Events[K]);
  }
}
