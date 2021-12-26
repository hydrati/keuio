// deno-lint-ignore-file no-explicit-any ban-types
import { ResponseValue } from "./keuio.ts";
import * as PathToRegexp from './path.ts';
import { ROUTER, ROUTER_HANDLER_INJECT } from "./symbols.ts";
import * as meta from './metadata.ts'

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

export function Route(method: string, path: string, opts?: (PathToRegexp.TokensToRegexpOptions & PathToRegexp.ParseOptions)):
  <T extends (...args: any[]) => ResponseValue>(targer: Object, key: string | symbol, desc: TypedPropertyDescriptor<T>) => void
{
  return (target, key, _) => {
    const map: Map<RouteNode, string | symbol> = meta.getDefault(target.constructor, ROUTER, () => new Map)
    for (const [key, _] of map) {
      if (key.path == path && key.method == method) throw new Error('repeated route path & method');
    }
    map.set(new RouteNode(method, path, opts), key);
  }
}

export function RouteMethod(method: string) {
  return (path: string, opts?: (PathToRegexp.TokensToRegexpOptions & PathToRegexp.ParseOptions)) => Route(method, path, opts);
}


type InjectParamMapByKey = Map<string | symbol, InjectParamByIndex>;
type InjectParamByIndex = Map<number, [number, string | number | true]>
function InjectParam(t: 0 | 1 | 2 | 3, k: string | number | true = true): ParameterDecorator {
  return (target, key, i) => {
    const map: InjectParamMapByKey = meta.getDefault(target.constructor, ROUTER_HANDLER_INJECT, () => new Map);
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