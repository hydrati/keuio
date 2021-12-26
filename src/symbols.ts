
export const TYPE = Symbol("Keuio.Type")
export const CONTROLLER = Symbol("Keuio.Type.Controller");
export const PROVIDER = Symbol("Keuio.Type.Provider");
export const SERVICE = Symbol("Keuio.Type.Service");
export const FACTORY = Symbol("Keuio.Type.Factory");
export const SET_TYPE = Symbol("Keuio.Type.Setter")

export const PROPS_INJECT = Symbol("Keuio.Inject.Properties");
export const INJECTABLE = Symbol("Keuio.Inject.Injectable")
export const INJECT_INSTANCE = Symbol("Keuio.Inject.Instance")
export const CONSTRUCTOR_INJECT = Symbol("Keuio.Inject.ConstructorParams");
export const INJECT_INSTANCE_CREATED = Symbol("Keuio.Inject.Instance.LazyCreated");

export const HOOKS_STORE = Symbol("Keuio.Hook.Store")
export const INIT = Symbol("Keuio.Hook.Init")
export const MIDDLEWARES = Symbol("Keuio.Hook.Middlewares");

export const ROUTER = Symbol("Keuio.Http.RouteStore");
export const ROUTER_HANDLER_INJECT = Symbol("Keuio.Inject.HttpParams");