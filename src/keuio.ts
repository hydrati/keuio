// deno-lint-ignore-file no-explicit-any ban-types no-namespace require-await

import * as Meta from './metadata.ts'
import * as PathToRegexp from './path.ts'
import { serve, Handler } from "https://deno.land/std@0.119.0/http/server.ts";
import * as url from './url.ts'



const DEBUG = true;
const SET_TYPE = Symbol("Keuio.Utils.SetType")

export class Provider {
  static [SET_TYPE]() {
    if (typeof this == "function") 
      As.Provider(this)
  }
}
export class Controller {
  static [SET_TYPE]() {
    if (typeof this == "function") 
      As.Controller(this)
  }
}

const services_store = new WeakMap<AnyConstructor, () => Promise<void>>();

const TYPE = Symbol("Keuio.Type")
const CONTROLLER = Symbol("Keuio.Type.Controller");
const PROVIDER = Symbol("Keuio.Type.Provider");
function SetType<T extends AnyConstructor>(type: symbol): (target: T) => void {
  return target => {
    if (!Meta.has(target, TYPE)) Meta.set(target, TYPE, type);
  }
}

function IsType(type: symbol): ClassDecorator {
  return (target: any) => {
    if (target?.[SET_TYPE] != null) target?.[SET_TYPE]?.();
    const t = Meta.get(target, TYPE) as symbol | null;
    if (t != type) throw new Error(`invaild type, type ${t?.description} != ${type.description}`);
  }
}

type CanConstruct<T> = new(...args: any[]) => T;

namespace As {
  export const Controller = SetType<CanConstruct<Controller>>(CONTROLLER);
  export const Provider = SetType<CanConstruct<Provider>>(PROVIDER);
}

const INJECTABLE = Symbol("Keuio.Inject.Injectable")
const INJECT_INSTANCE = Symbol("Keuio.Inject.Instance")
const INJECT_INSTANCE_CREATED = Symbol("Keuio.Inject.Instance.LazyCreated");
export function Injectable(): ClassDecorator {
  return composeClassDecorator(
    IsType(PROVIDER),
    function(target: any) {
      Meta.set(target, INJECTABLE, true);
      Meta.set(target, INJECT_INSTANCE_CREATED, false);
      services_store.set(target, async () => {
        services_store.delete(target);
        const instance = await createWithInject(target)
        Meta.set(target, INJECT_INSTANCE, instance);
        Meta.set(target, INJECT_INSTANCE_CREATED, true);
      })
    }
  )
}

export enum Hooks {
  Init,
  OnRequest,
}

interface Buildable {
  build(...args: unknown[]): unknown;
}

interface BuildableClass extends AnyConstructor {
  prototype: Buildable;
}

interface InjectMetadata {
  injects?: Record<string, string>;
}

type NewOf<T> = T extends new(...args: any[]) => infer P ? P : any;

function composeMethodDecorator<T>(...md: MethodDecorator[]): (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T> | void {
  return (target: Object, propertyKey: string | symbol, descriptor) => {
    let desc: TypedPropertyDescriptor<T> | undefined = undefined;
    for(const d of md) {
      const v: void | TypedPropertyDescriptor<T> = d<T>(target, propertyKey, desc ?? descriptor);
      if (v != null) desc = v;
    }
    return desc;
  }
}

function composeClassDecorator(...cd: ClassDecorator[]): ClassDecorator {
  return (target) => {
    let t;
    for (const d of cd) {
      const v: void | any = d(t ?? target);
      if (v != null) t = v
    }
    return t;
  }
}

function getName(o: new(...args: any[]) => any): string {
  if (DEBUG) return o.prototype[Symbol.toStringTag] ?? o.name ?? "anonymous";
  else return "anonymous";
}

const HOOKS_STORE = Symbol("Keuio.HookStore")
export function Hook(ev: Hooks): MethodDecorator {
  if (ev == Hooks.Init) return Init as MethodDecorator;
  return (target, _, d) => {
    if (!Meta.has(target.constructor, HOOKS_STORE)) Meta.set(target.constructor, HOOKS_STORE, new Map);
    const map = Meta.get(target.constructor, HOOKS_STORE) as Map<Hooks, Set<Function>>;
    if (!map.has(ev)) map.set(ev, new Set);
    const set = map.get(ev)!;
    set.add(d.value as unknown as Function);
  }
}

const INIT = Symbol("Keuio.Init")
export function Init(target: Object, _: unknown, d: TypedPropertyDescriptor<(...args: any[]) => unknown | Promise<unknown>>): void {
  Meta.set(target.constructor, INIT, d.value);
}

type AnyConstructor = new(...args: any[]) => unknown
const CONSTRUCTOR_INJECT = Symbol("Keuio.ConstructorInject");
export function Inject<T extends [AnyConstructor] | AnyConstructor[]>(...classes: T): 
  (target: AnyConstructor) => void
{
  return (target) => {
    if (!Meta.has(target, CONSTRUCTOR_INJECT)) {
      Meta.set(target, CONSTRUCTOR_INJECT, classes);
    } else {
      const set = (Meta.get(target, CONSTRUCTOR_INJECT)! as Array<AnyConstructor>)
      for (const _class of classes) {
        if (!set.includes(_class)) set.push(_class);
      }
    }
  }
}

const PROPS_INJECT = Symbol("Keuio.PropertyInject");
export function InjectProperty<T extends AnyConstructor>(_class: T): 
  (target: Object, key: string | symbol) => void
{
  return (target, k) => {
    if (!Meta.has(target.constructor, PROPS_INJECT)) Meta.set(target.constructor, PROPS_INJECT, new Map);
    const map = Meta.get(target.constructor, PROPS_INJECT) as Map<string | symbol, AnyConstructor>;
    map.set(k, _class);
  }
}
type Construct<T> = T extends new(...args: any[]) => infer P ? P : any;

const lazy_promises = new WeakMap<AnyConstructor, Promise<void>>();

async function createLazyInjectInstance<T extends AnyConstructor>(o: T): Promise<void> {
  if (!services_store.has(o)) {
    const p = lazy_promises.get(o);
    if (p == null) throw new Error("illegal injectable class (4)");
    return await p
  } else {
    const init = services_store.get(o);
    if (typeof init !== 'function') throw new Error("illegal injectable class");
    const p = init();
    lazy_promises.set(o, p);
    return await p;
  }
}

async function getInjectInstance<T extends AnyConstructor>(o: T): Promise<Construct<T>> {
  if (Meta.get(o, INJECTABLE) != true) throw new Error('try to inject a `uninjectable` class');
  if (Meta.get(o, INJECT_INSTANCE_CREATED) != true) {
    await createLazyInjectInstance(o);
    if (Meta.get(o, INJECT_INSTANCE_CREATED) != true) throw new Error("illegal injectable class (2)")
  }
  
  const inst = Meta.get(o, INJECT_INSTANCE);
  if (inst == null) throw new Error("illegal injectable class (3)")
  return inst as Construct<T>;
}

export async function createWithInject<
  T extends AnyConstructor,
  TArguments extends [unknown] | unknown[]
>(
  app: T, 
  ...args: TArguments
): Promise<Construct<T>> {
  const classes = Meta.get(app, CONSTRUCTOR_INJECT) as Array<AnyConstructor>;
  const properties = Meta.get(app, PROPS_INJECT) as Map<string | symbol, AnyConstructor>;
  const init = Meta.get(app, INIT) as Function;

  let instance: any;
  if (classes == null) instance = new app();
  else instance = new app(...await Promise.all(classes.map(getInjectInstance)));

  if (properties != null) {
    for(const [key, value] of properties) {
      instance[key] = await getInjectInstance(value);
    }
  }

  const r = await init?.apply(instance, args);

  return instance;
}

const MIDDLEWARES = Symbol("Keuio.Middlewares");
export function Middleware(target: Object, _: string | symbol, desc: TypedPropertyDescriptor<() => void>): void {
  if (!Meta.has(target.constructor, MIDDLEWARES)) Meta.set(target.constructor, MIDDLEWARES, [desc.value]);
  else (Meta.get(target.constructor, MIDDLEWARES) as Function[]).push(desc.value!);
}

const ROUTER = Symbol("Keuio.Http.Router");
const ROUTER_HANDLER_INJECT = Symbol("Keuio.ParamInject");

class RouteNode {
  public readonly keys: PathToRegexp.Key[];
  public readonly regex: RegExp;
  constructor(public method: string, public path: string, opts?: (PathToRegexp.TokensToRegexpOptions & PathToRegexp.ParseOptions)) {
    this.keys = [];
    this.regex = PathToRegexp.pathToRegexp(path, this.keys, opts);
  }

  exec(path: string) {
    return this.regex.exec(path);
  }
}

interface InjectParam {
  t: number;
  k?: string | number;
}

// Map<methodKey, Map<index, keys | true>>
type InjectParamMapByKey = Map<string | symbol, InjectParamByIndex>;
type InjectParamByIndex = Map<number, [number, string | number | true]>
function InjectParam(t: 0 | 1 | 2 | 3, k: string | number | true = true): ParameterDecorator {
  return (target, key, i) => {
    const map: InjectParamMapByKey = Meta.getDefault(target.constructor, ROUTER_HANDLER_INJECT, () => new Map);
    let s: InjectParamByIndex | undefined = map.get(key);
    if (s == undefined) {
      s = new Map();
      map.set(key, s);
    }

    if (s!.has(i)) throw new Error('repeated all inject param');
    s.set(i, [t, k])
    return;
  }
}
export function Query(key: string): ParameterDecorator {
  return InjectParam(0, key)
}
export function Match(key: string | number): ParameterDecorator {
  return InjectParam(1, key)
}
export function Queries(): ParameterDecorator {
  return InjectParam(2);
}
export function Matches(): ParameterDecorator {
  return InjectParam(3);
}

async function callHttpResponseFn(
  h: (...args: any) => ResponseValue, 
  con: Controller,
  u: url.Url,
  params?: any[]
): Promise<ResponseValue> {
  try {
    const resp = await h.apply(con, params ?? []);
    return resp
  } catch(e: any) {
    return await defaultErrorHandler(u, h, e)
  }
}

async function defaultErrorHandler(u: url.Url, h: (...args: any) => ResponseValue, e: any): Promise<ResponseValue> {
  const msg = `Handler crash at ${u.href}, ${h.name}: `
  console.error(msg, e)
  return new Response(e.toString(), {
    status: 500
  })
}
const NOT_FOUND = new TextEncoder().encode("Not Found")
export async function defaultNotFoundHandler() {
  return new Response(NOT_FOUND, { status: 404 });
}

export async function toHandler<T extends CanConstruct<Controller>, A extends [unknown] | unknown[]>(app: T, ...args: A): Promise<Handler> {
  const router: Map<RouteNode, string | symbol> = Meta.get(app, ROUTER)!;
  const routerInject: InjectParamMapByKey = Meta.get(app, ROUTER_HANDLER_INJECT)!;
  const con = await createWithInject(app, ...args);
  return async(req, conn) => {
    for (const [k, v] of router) {
      if (k.method.toUpperCase() == req.method.toUpperCase()) {
        const u = url.parse(req.url, true);
        const m = k.exec(u.pathname!);
        // console.log(`${req.method} ${u.path}`);
        if (m != null) {
          const h = (con as any)[v] as (...args: any) => ResponseValue;
          const pm: Record<string | number, string> = {};
          for(const [pk, pv] of k.keys.entries()) {
            pm[pv.name] = m?.[pk + 1]
          }
          const injects = routerInject.get(v);
          if (injects != null) {
            const params: any[] = [];
            for (const [k, v] of injects) {
              const [t, c] = v;
              S: switch(t) {
                case 0:
                  params[k] = u?.query?.[c as string] ?? null
                  break S;
                case 1:
                  params[k] = pm?.[c as any] ?? null
                  break S;
                
                case 2:
                  params[k] = u!.query ?? null
                  break S;

                case 3:
                  params[k] = m ?? null
                  break S;
              }
            }
            return toResponse(await callHttpResponseFn(h, con, u, params));
          } else {
            return toResponse(await callHttpResponseFn(h, con, u));
          }
        }
      }
    }
    return toResponse(defaultNotFoundHandler())
  }
}

export function Route(method: string, path: string, opts?: (PathToRegexp.TokensToRegexpOptions & PathToRegexp.ParseOptions)):
  <T extends (...args: any[]) => ResponseValue>(targer: Object, key: string | symbol, desc: TypedPropertyDescriptor<T>) => void
{
  return (target, key, _) => {
    const map: Map<RouteNode, string | symbol> = Meta.getDefault(target.constructor, ROUTER, () => new Map)
    for (const [key, _] of map) {
      if (key.path == path && key.method == method) throw new Error('repeated route path & method');
    }
    map.set(new RouteNode(method, path, opts), key);
  }
}

export function RouteMethod(method: string) {
  return (path: string, opts?: (PathToRegexp.TokensToRegexpOptions & PathToRegexp.ParseOptions)) => Route(method, path, opts);
}

export const Get = RouteMethod("GET");
export const Post = RouteMethod("Post");

export interface IResponder {
  respond(): ResponseValue;
}
export type ResponderFunction = () => ResponseValue;

export type ResponseValue = Promise<Responder> | Responder;
export type Responder = 
  |  BodyInit 
  | [BodyInit, ResponseInit] 
  | Response
  | IResponder 
  | ResponderFunction;

export async function toResponse(responder: ResponseValue): Promise<Response> {
  if (responder instanceof Response) return responder;
  if (typeof responder == "function") return await toResponse(await responder());
  if (typeof (responder as IResponder).respond == "function") return await toResponse(await (responder as IResponder).respond())
  if (typeof (responder as any)?.then == "function") 
    return await toResponse(await (responder as PromiseLike<Responder>));
  if (responder instanceof Array) return new Response(responder[0], responder[1]);
  else return new Response(await (responder as BodyInit | PromiseLike<BodyInit>));
}

export const serveHandler = serve;
export async function run<T extends CanConstruct<Controller>, A extends [unknown] | unknown[]>(app: T, ...args: A): Promise<void> {
  const handler = await toHandler(app, ...args);
  await serveHandler(handler)
}
