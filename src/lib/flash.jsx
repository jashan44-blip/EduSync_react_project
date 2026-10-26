import { useEffect, useSyncExternalStore } from "react";

/* Toast ("flash") messages.
   The original appended <div class="flash ..."> nodes into a container
   element and removed them after a timeout. Same behaviour here, but the
   list lives in a tiny store and <FlashStack> renders it. A message sent to
   a target that isn't on screen is dropped, exactly as before. */
const EMPTY = [];

export function createFlashStore({ ttl, fade = false, classFor }) {
  let items = {};
  const mounted = {};
  const listeners = new Set();
  let nextId = 1;
  const emit = () => listeners.forEach(l => l());
  const set = (target, list) => { items = { ...items, [target]: list }; emit(); };

  return {
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get(target) { return items[target] || EMPTY; },
    mount(target) {
      mounted[target] = (mounted[target] || 0) + 1;
      return () => { mounted[target] -= 1; };
    },
    flash(message, type, target) {
      if (!mounted[target]) return;
      const id = nextId++;
      set(target, [...(items[target] || EMPTY), { id, message, className: classFor(type), fading: false }]);
      setTimeout(() => {
        if (fade) {
          set(target, (items[target] || EMPTY).map(i => i.id === id ? { ...i, fading: true } : i));
          setTimeout(() => set(target, (items[target] || EMPTY).filter(i => i.id !== id)), 300);
        } else {
          set(target, (items[target] || EMPTY).filter(i => i.id !== id));
        }
      }, ttl);
    }
  };
}

export function FlashStack({ store, target, className }) {
  const list = useSyncExternalStore(store.subscribe, () => store.get(target));
  useEffect(() => store.mount(target), [store, target]);
  return (
    <div id={target} className={className}>
      {list.map(i => (
        <div key={i.id} className={i.className}
          style={i.fading ? { transition: "opacity .3s", opacity: 0 } : undefined}>
          {i.message}
        </div>
      ))}
    </div>
  );
}
