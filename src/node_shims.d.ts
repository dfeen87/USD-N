declare module "fs" {
  const fs: {
    existsSync: (path: string) => boolean;
    createReadStream: (path: string, options?: { encoding?: string }) => any;
  };
  export default fs;
}

declare module "fs/promises" {
  export function readFile(path: string, encoding?: string): Promise<string | Buffer>;
}

declare module "readline" {
  const readline: {
    createInterface: (options: { input: any; crlfDelay?: number }) => any;
  };
  export default readline;
}

declare module "crypto" {
  const crypto: {
    createHash: (algorithm: string) => {
      update: (data: string) => { digest: (encoding: "hex") => string };
    };
  };
  export default crypto;
}

declare module "http" {
  export interface IncomingMessage {
    url?: string;
    method?: string;
    headers: Record<string, string | string[] | undefined>;
    socket: { remoteAddress?: string };
    on(event: 'data', callback: (chunk: Buffer) => void): void;
    on(event: 'end', callback: () => void): void;
    on(event: 'error', callback: (err: Error) => void): void;
  }

  export interface ServerResponse {
    writeHead(statusCode: number, headers?: Record<string, string>): void;
    end(data?: string | Buffer): void;
  }

  export function createServer(
    requestListener?: (req: IncomingMessage, res: ServerResponse) => void
  ): {
    listen(port: number, callback?: () => void): void;
  };
}

declare module "path" {
  export function join(...paths: string[]): string;
  export function extname(path: string): string;
  export function dirname(path: string): string;
}

declare module "url" {
  export function fileURLToPath(url: string): string;
}

declare module "node:test" {
  const test: (name: string, fn: () => void | Promise<void>) => void;
  export default test;
}

declare module "node:assert/strict" {
  const assert: {
    ok: (value: unknown, message?: string) => void;
    equal: <T>(actual: T, expected: T, message?: string) => void;
    deepEqual: <T>(actual: T, expected: T, message?: string) => void;
    throws: (fn: () => unknown, options?: { message?: string }) => void;
  };
  export default assert;
}

declare const process: {
  argv: string[];
  exit: (code?: number) => never;
  env: Record<string, string | undefined>;
};

declare const __filename: string;
declare const __dirname: string;
