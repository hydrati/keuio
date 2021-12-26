export interface IResponder {
  respond(): ResponseValue;
}

export type ResponderFunction = () => ResponseValue;

export type ResponseValue = Promise<Responder> | Responder;
export type Responder = 
  | BodyInit 
  | [BodyInit, ResponseInit] 
  | Response
  | IResponder 
  | ResponderFunction;

export async function toResponse(responder: ResponseValue): Promise<Response> {
  if (responder instanceof Response) return responder;
  if (typeof responder == "function") return await toResponse(await responder());
  if (typeof (responder as IResponder).respond == "function") return await toResponse(await (responder as IResponder).respond())
  if (typeof (responder as PromiseLike<unknown>)?.then == "function") 
    return await toResponse(await (responder as PromiseLike<Responder>));
  if (responder instanceof Array) return new Response(responder[0], responder[1]);
  else return new Response(await (responder as BodyInit | PromiseLike<BodyInit>));
}