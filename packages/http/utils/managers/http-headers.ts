import { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from 'http';
import { HttpHeaderName, HttpHeaderValue, HttpHeaders } from '../../interface';
import { Maybe } from '@medishn/toolkit';
/**
 * @publicApi
 */
export class HeadersManager implements HttpHeaders {
  private response: ServerResponse;

  constructor(response: ServerResponse, private request: IncomingMessage) {
    this.response = response;
  }

  set<T extends string, XHeaders extends string>(name: HttpHeaderName<T>, value: HttpHeaderValue<T, XHeaders>): void;
  set(name: HttpHeaderName, value: any): void {
    this.response.setHeader(name, value);
  }

  get<T extends string, XHeaders extends string>(name: HttpHeaderName<T>): Maybe<HttpHeaderValue<T, XHeaders>>;
  get(name: string): Maybe<string | number | string[]>;
  get(name: HttpHeaderName) {
    return this.response.getHeader(name);
  }

  has(name: HttpHeaderName): boolean {
    return this.response.hasHeader(name);
  }

  remove<T extends string>(name: HttpHeaderName<T, string>): void {
    this.response.removeHeader(name);
  }
  getAll(): OutgoingHttpHeaders {
    return this.request.headers;
  }
}
