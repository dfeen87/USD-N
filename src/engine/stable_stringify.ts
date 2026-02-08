// src/engine/stable_stringify.ts
export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === null) return null;

  const t = typeof value;

  if (t === "number" || t === "string" || t === "boolean") return value;

  // NOTE: BigInt cannot be JSON-stringified directly; tag to preserve type.
  if (typeof value === "bigint") {
    return { __type: "bigint", value: value.toString() };
  }

  if (Array.isArray(value)) return value.map(canonicalize);

  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);
    const sortedKeys =
      keys.length > 1 && !areKeysSorted(keys) ? [...keys].sort() : keys;
    const out: Record<string, unknown> = {};
    for (const k of sortedKeys) out[k] = canonicalize(obj[k]);
    return out;
  }

  // undefined, function, symbol: not permitted in hashed payloads
  throw new Error(`UNSUPPORTED_TYPE: ${t}`);
}

function areKeysSorted(keys: string[]): boolean {
  for (let i = 1; i < keys.length; i++) {
    if (keys[i - 1] > keys[i]) return false;
  }
  return true;
}
