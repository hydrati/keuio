// deno-lint-ignore-file no-explicit-any
import { SET_TYPE, TYPE } from "./symbols.ts";
import * as meta from './metadata.ts'
import { AnyConstructor } from "./utils.ts";

export function SetType<T extends AnyConstructor>(type: symbol): (target: T) => void {
  return target => {
    if (!meta.has(target, TYPE)) meta.set(target, TYPE, type);
  }
}

export function IsType(type: symbol): ClassDecorator {
  return (target: any) => {
    if (target?.[SET_TYPE] != null) target?.[SET_TYPE]?.();
    const t = meta.get(target, TYPE) as symbol | null;
    if (t != type) throw new Error(`invaild type, type ${t?.description} != ${type.description}`);
  }
}