// deno-lint-ignore-file no-explicit-any
export type CanConstruct<T> = new(...args: any[]) => T;
export type NewOf<T> = T extends CanConstruct<infer P> ? P : any;
export type AnyConstructor = CanConstruct<any>;

export interface Buildable {
  build(...args: unknown[]): unknown | Promise<unknown>;
}

export function composeMethodDecorator<T>(...md: MethodDecorator[]): (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T> | void {
  return (target: Object, propertyKey: string | symbol, descriptor) => {
    let desc: TypedPropertyDescriptor<T> | undefined = undefined;
    for(const d of md) {
      const v: void | TypedPropertyDescriptor<T> = d<T>(target, propertyKey, desc ?? descriptor);
      if (v != null) desc = v;
    }
    return desc;
  }
}

export function composeClassDecorator(...cd: ClassDecorator[]): ClassDecorator {
  return (target) => {
    let t;
    for (const d of cd) {
      const v: void | any = d(t ?? target);
      if (v != null) t = v
    }
    return t;
  }
}