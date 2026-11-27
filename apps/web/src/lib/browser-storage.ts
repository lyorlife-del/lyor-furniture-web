// Keep this tab usable when a browser denies Web Storage.
export function browserStorage(kind: "localStorage" | "sessionStorage") {
  const memory = new Map<string, string>();
  const pending = new Set<string>();
  return {
    getItem(key: string) {
      if (pending.has(key)) return memory.get(key) ?? null;
      try { return window[kind].getItem(key); }
      catch { return memory.get(key) ?? null; }
    },
    setItem(key: string, value: string) {
      memory.set(key, value);
      try { window[kind].setItem(key, value); pending.delete(key); }
      catch { pending.add(key); }
    },
    removeItem(key: string) {
      memory.delete(key);
      try { window[kind].removeItem(key); pending.delete(key); }
      catch { pending.add(key); }
    },
  };
}
