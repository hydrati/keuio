import { INJECT_INSTANCE_CREATED, INJECT_INSTANCE, INJECTABLE } from './symbols.ts';
import { AnyConstructor, NewOf } from './utils.ts';
import * as meta from './metadata.ts'
import { createWithInject } from "./inject.ts";

const lazy_promises = new WeakMap<AnyConstructor, Promise<void>>();
const lazy_fn = new WeakMap<AnyConstructor, () => Promise<void>>();
async function createInstance<T extends AnyConstructor>(o: T): Promise<void> {
  if (!lazy_fn.has(o)) {
    const p = lazy_promises.get(o);
    if (p == null) throw new Error("illegal injectable class (4)");
    return await p
  } else {
    const init = lazy_fn.get(o);
    if (typeof init !== 'function') throw new Error("illegal injectable class");
    const p = init();
    lazy_promises.set(o, p);
    return await p;
  }
}

export async function getLazyInstance<T extends AnyConstructor>(o: T): Promise<NewOf<T>> {
  if (meta.get(o, INJECTABLE) != true) throw new Error('try to inject a `uninjectable` class');
  if (meta.get(o, INJECT_INSTANCE_CREATED) != true) {
    await createInstance(o);
    if (meta.get(o, INJECT_INSTANCE_CREATED) != true) throw new Error("illegal injectable class (2)")
  }
  
  const inst = meta.get(o, INJECT_INSTANCE);
  if (inst == null) throw new Error("illegal injectable class (3)")
  return inst as NewOf<T>;
}

export function createLazyInstance<T extends AnyConstructor>(target: T): void {
  lazy_fn.set(target, async () => {
    lazy_fn.delete(target);
    const instance = await createWithInject(target)
    meta.set(target, INJECT_INSTANCE, instance);
    meta.set(target, INJECT_INSTANCE_CREATED, true);
  })
}

