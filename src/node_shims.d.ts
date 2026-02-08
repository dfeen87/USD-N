declare module "fs" {
  const fs: {
    existsSync: (path: string) => boolean;
    createReadStream: (path: string, options?: { encoding?: string }) => any;
  };
  export default fs;
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
};
