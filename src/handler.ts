// deno-lint-ignore-file no-explicit-any require-await
import { ResponseValue } from "./response.ts";
import { Controller } from "./universal.ts";
import { Url } from "./url.ts";

export async function callHttpResponseFn(
  h: (...args: any) => ResponseValue, 
  con: Controller,
  u: Url,
  params?: any[]
): Promise<ResponseValue> {
  try {
    const resp = await h.apply(con, params ?? []);
    return resp
  } catch(e: any) {
    return await defaultErrorHandler(u, h, e)
  }
}

export async function defaultErrorHandler(u: Url, h: (...args: any) => ResponseValue, e: any): Promise<ResponseValue> {
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
