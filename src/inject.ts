// deno-lint-ignore-file ban-types
import { AnyConstructor, composeClassDecorator, NewOf } from "./utils.ts";
import * as meta from './metadata.ts'
import { CONSTRUCTOR_INJECT, INIT, INJECTABLE, INJECT_INSTANCE_CREATED, PROPS_INJECT, PROVIDER } from "./symbols.ts";
import { getLazyInstance } from "./lazy_instance.ts";
import { IsType } from "./type.ts";

export function Inject<T extends [AnyConstructor] | AnyConstructor[]>(...classes: T): 
  (target: AnyConstructor) => void
{
  return (target) => {
    if (!meta.has(target, CONSTRUCTOR_INJECT)) {
      meta.set(target, CONSTRUCTOR_INJECT, classes);
    } else {
      const set = (meta.get(target, CONSTRUCTOR_INJECT)! as Array<AnyConstructor>)
      for (const _class of classes) {
        if (!set.includes(_class)) set.push(_class);
      }
    }
  }
}

export function InjectProperty<T extends AnyConstructor>(_class: T): 
  (target: Object, key: string | symbol) => void
{
  return (target, k) => {
    if (!meta.has(target.constructor, PROPS_INJECT)) meta.set(target.constructor, PROPS_INJECT, new Map);
    const map = meta.get(target.constructor, PROPS_INJECT) as Map<string | symbol, AnyConstructor>;
    map.set(k, _class);
  }
}

export function Injectable(): ClassDecorator {
  return composeClassDecorator(
    IsType(PROVIDER),
    function(target) {
      meta.set(target, INJECTABLE, true);
      meta.set(target, INJECT_INSTANCE_CREATED, false);
      createWithInject(target as unknown as AnyConstructor)
    }
  )
}

export async function createWithInject<
  T extends AnyConstructor,
  TArguments extends [unknown] | unknown[]
>(
  app: T, 
  ...args: TArguments
): Promise<NewOf<T>> {
  const classes = meta.get(app, CONSTRUCTOR_INJECT) as Array<AnyConstructor>;
  const properties = meta.get(app, PROPS_INJECT) as Map<string | symbol, AnyConstructor>;
  const init = meta.get(app, INIT) as Function;

  let instance: NewOf<T>;
  if (classes == null) instance = new app();
  else instance = new app(
    ...await Promise.all(classes.map(getLazyInstance))
  );

  if (properties != null) {
    for(const [key, value] of properties) {
      instance[key] = await getLazyInstance(value);
    }
  }

  await init?.apply(instance, args);

  return instance;
}

