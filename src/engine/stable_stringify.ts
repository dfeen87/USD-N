// src/engine/stable_stringify.ts
export function stableStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === null) return null;

  const t = typeof value;

  if (t === "number" || t === "string" || t === "boolean") return value;

  // NOTE: BigInt cannot be JSON-stringified directly; represent as string.
  if (t === "bigint") return value.toString();

  if (Array.isArray(value)) return value.map(canonicalize);

  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = canonicalize(obj[k]);
    return out;
  }

  // undefined, function, symbol: not permitted in hashed payloads
  return null;
}
