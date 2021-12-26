// deno-lint-ignore-file ban-types
const table = new WeakMap<object, Map<unknown, unknown>>()

export function get<T, K, O extends object>(o: O, k: K): T | null {
  const obj = table.get(o);
  if (obj == null) return null;
  else return (obj.get(k) ?? null) as T | null
}

export function set<T, K, O extends object>(o: O, k: K, v: T): void {
  let obj = table.get(o);
  if (obj == null) {
    obj = new Map;
    table.set(o, obj)
  }
  obj.set(k, v)
}

export function has<T, K, O extends object>(o: O, k: K): boolean {
  const obj = table.get(o);
  if (obj == null) return false;
  else return obj.has(k)
}

export function getDefault<T, K, O extends object>(o: O, k: K, f: () => T): T {
  let obj = table.get(o);
  if (obj == null) {
    const v = f();
    obj = new Map;
    obj.set(k, v);
    table.set(o, obj);
    return v;
  } else {
    const e = obj.get(k)
    if (e == null) {
      const v = f();
      obj.set(k, v);
      return v;
    } else return e as T
  }
}

export function Attr<T, V>(key: T, value: V): ClassDecorator {
  return target => { set(target, key, value) }
}