// deno-lint-ignore-file ban-types no-explicit-any
import * as meta from './metadata.ts'
import { HOOKS_STORE, INIT, MIDDLEWARES } from "./symbols.ts";

export enum Hooks {
  Init,
  OnRequest,
}

export function Hook(ev: Hooks): MethodDecorator {
  if (ev == Hooks.Init) return Init as MethodDecorator;
  return (target, _, d) => {
    if (!meta.has(target.constructor, HOOKS_STORE)) meta.set(target.constructor, HOOKS_STORE, new Map);
    const map = meta.get(target.constructor, HOOKS_STORE) as Map<Hooks, Set<Function>>;
    if (!map.has(ev)) map.set(ev, new Set);
    const set = map.get(ev)!;
    set.add(d.value as unknown as Function);
  }
}


export function Init(target: Object, _: unknown, d: TypedPropertyDescriptor<(...args: any[]) => unknown | Promise<unknown>>): void {
  meta.set(target.constructor, INIT, d.value);
}

export function Middleware(target: Object, _: string | symbol, desc: TypedPropertyDescriptor<() => void>): void {
  if (!meta.has(target.constructor, MIDDLEWARES)) meta.set(target.constructor, MIDDLEWARES, [desc.value]);
  else (meta.get(target.constructor, MIDDLEWARES) as Function[]).push(desc.value!);
}