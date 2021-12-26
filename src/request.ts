import { Url } from './url.ts';
export class RequestContextImpl implements RequestContext {

  public readonly addr: RequestAddr;
  public readonly body: RequestBody;

  constructor(
    private readonly _http: Request,
    public readonly url: Url,
    public readonly method: string,
    private readonly _conn: Deno.Conn,
  ) {
    this.addr = { local: _conn.localAddr, remote: _conn.remoteAddr }
    this.body = new RequestBodyImpl(this._http)
  }

  clone() {
    return new RequestContextImpl(
      this._http.clone(),
      Object.assign({}, this.url),
      this.method,
      this._conn
    )
  }

  get headers() {
    return this._http.headers;
  }

  get signal() {
    return this._http.signal;
  }

  get keepalive() {
    return this._http.keepalive;
  }
}

class RequestBodyImpl implements RequestBody {
  constructor(private _body: Body) {}
  get used() { return this._body.bodyUsed }
  stream() { return this._body.body }
  buffer() { return this._body.arrayBuffer() }
  blob() { return this._body.blob() }
  form() { return this._body.formData() }
  json() { return this._body.json() }
  text() { return this._body.text() }
  async bytes() { return new Uint8Array(await this.buffer()) }
}

export interface RequestContext {
  readonly headers: Headers;
  readonly url: Url;
  readonly body: RequestBody;
  readonly method: string;
  readonly signal: AbortSignal;
  readonly keepalive: boolean;
  readonly addr: RequestAddr;
  clone(): RequestContext;
}

export interface RequestAddr {
  readonly local: Deno.Addr,
  readonly remote: Deno.Addr
}

export interface RequestBody { 
  readonly used: boolean;
  stream(): ReadableStream<Uint8Array> | null;
  buffer(): Promise<ArrayBuffer>;
  blob(): Promise<Blob>;
  form(): Promise<FormData>;
  json<T>(): Promise<T>;
  text(): Promise<string>;
  bytes(): Promise<Uint8Array>;
}