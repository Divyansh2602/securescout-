// `hpp` ships no type definitions; declare it as Express middleware.
declare module 'hpp' {
  import { RequestHandler } from 'express';
  interface HppOptions {
    whitelist?: string | string[];
    checkBody?: boolean;
    checkBodyOnlyForContentType?: string;
    checkQuery?: boolean;
  }
  function hpp(options?: HppOptions): RequestHandler;
  export = hpp;
}
