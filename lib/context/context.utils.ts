import { IncomingMessage, ServerResponse } from 'http';
import { ResponseBody } from './Context.interface';
import { ServerRequest } from '../types';
export function setCharset(contentType: string, charset: string): string {
  const hasCharset = /charset=([a-zA-Z0-9-]+)/.test(contentType);
  if (hasCharset) {
    return contentType;
  }
  return `${contentType}; charset=${charset}`;
}
export function isFresh(req: IncomingMessage, res: ServerResponse): boolean {
  const { method, headers } = req;
  const statusCode = res.statusCode;

  // Cache validation is only applicable for GET and HEAD requests with 2xx responses
  if (!['GET', 'HEAD'].includes(method!)) {
    return false;
  }

  if (statusCode < 200 || statusCode >= 300) {
    return false;
  }

  // Retrieve headers for cache validation
  const ifNoneMatch = headers['if-none-match'];
  const ifModifiedSince = headers['if-modified-since'];
  const etag = res.getHeader('ETag') as string | undefined;
  const lastModified = res.getHeader('Last-Modified') as string | undefined;
  // If neither If-None-Match nor If-Modified-Since is present, not fresh
  if (!ifNoneMatch && !ifModifiedSince) {
    return false;
  }

  // Strong ETag validation
  if (ifNoneMatch && etag) {
    const clientEtags = ifNoneMatch.split(',').map((tag) => tag.trim());
    if (clientEtags.includes(etag)) {
      return true;
    }
  }

  // Weak Last-Modified validation
  if (ifModifiedSince && lastModified) {
    const modifiedSinceTime = Date.parse(ifModifiedSince);
    const lastModifiedTime = Date.parse(lastModified);

    if (!isNaN(modifiedSinceTime) && !isNaN(lastModifiedTime)) {
      if (lastModifiedTime <= modifiedSinceTime) {
        return true;
      }
    }
  }

  return false;
}
export function handleContentType(chunk: ResponseBody<any>, res: any): ResponseBody<any> {
  if (typeof chunk === 'string') {
    if (!res.getHeader('Content-Type')) {
      res.setHeader('Content-Type', 'text/html');
    }
    return chunk;
  }
  if (typeof chunk === 'boolean' || typeof chunk === 'number' || typeof chunk === 'object') {
    if (chunk === null) {
      chunk = ''; // Handle null case with an empty response body
    } else if (Buffer.isBuffer(chunk)) {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/octet-stream');
      }
      return chunk;
    } else {
      return chunk;
    }
  } else {
    chunk = '';
  }
  return chunk;
}
export function setContentTypeForString(res: any): void {
  const type = res.getHeader('Content-Type');
  if (typeof type === 'string') {
    res.setHeader('Content-Type', setCharset(type, 'utf-8')); // Utility function to set charset
  } else {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  }
}
export function calculateContentLength(chunk: ResponseBody<any>, encoding: BufferEncoding | undefined): number | undefined {
  let len: number | undefined;
  if (chunk !== undefined) {
    if (Buffer.isBuffer(chunk)) {
      len = chunk.length;
    } else if (typeof chunk === 'string') {
      len = Buffer.byteLength(chunk, encoding);
    } else if (chunk && 'data' in chunk) {
      const data = chunk;

      if (Buffer.isBuffer(data)) {
        len = data.length;
      } else if (typeof data === 'string') {
        len = Buffer.byteLength(data, encoding);
      } else if (chunk && 'data' in chunk) {
        const jsonString = JSON.stringify(chunk);
        len = Buffer.byteLength(jsonString, encoding);
      }
    }
  }
  return len;
}
export function generateETag(body: string): string {
  return require('crypto').createHash('sha256').update(body).digest('hex');
}
export function handleETag(ctx: ServerRequest, chunk: ResponseBody<any>, len: number | undefined, res: any): void {
  const etagFn = ctx.settings?.['etag'];
  const generateETagFunction = typeof etagFn === 'function' ? etagFn : generateETag;
  // Avoid generating ETag if already present

  if (res.getHeader('ETag') || len === undefined || !chunk) {
    return;
  }
  let etag: string | undefined;
  if (typeof chunk === 'object') {
    if ('data' in chunk) {
      const data = chunk.data;
      if (data !== null && data !== undefined) {
        etag = generateETagFunction(data);
      }
    }
  }
  // Set the ETag header if generated
  if (etag) {
    res.setHeader('ETag', etag);
  }
}
export function cleanHeaders(res: ServerResponse): void {
  res.removeHeader('Content-Type');
  res.removeHeader('Content-Length');
  res.removeHeader('Transfer-Encoding');
}
export function handleResetContent(res: ServerResponse): void {
  res.setHeader('Content-Length', '0');
  res.removeHeader('Transfer-Encoding');
}
