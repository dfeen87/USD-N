// src/cli/verify.ts
import fs from "fs";
import readline from "readline";
import { verifyAndReplay } from "../engine/replay_verify.js";
import type { HashedEvent } from "../engine/hashchain.js";

type VerifyOptions = {
  file: string;
  quiet: boolean;
  maxErrors: number;
};

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const events = await readJsonl(opts.file);

  const res = verifyAndReplay(events);

  if (!opts.quiet) {
    console.log(`USD-N VERIFY`);
    console.log(`File: ${opts.file}`);
    console.log(`Events: ${res.events}`);
    console.log(`Final supply: ${formatUSD(res.final_supply_cents)}`);
    console.log(`Status: ${res.ok ? "OK" : "FAIL"}`);
  }

  if (!res.ok) {
    const shown = res.errors.slice(0, opts.maxErrors);
    for (const e of shown) console.error(e);
    if (res.errors.length > shown.length) {
      console.error(`...and ${res.errors.length - shown.length} more`);
    }
    process.exit(1);
  }

  process.exit(0);
}

function parseArgs(args: string[]): VerifyOptions {
  if (args.length === 0) {
    usageAndExit();
  }

  let file = "";
  let quiet = false;
  let maxErrors = 50;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];

    if (!a) continue;

    if (a === "--quiet" || a === "-q") {
      quiet = true;
      continue;
    }

    if (a === "--max-errors") {
      const v = args[i + 1];
      if (!v) usageAndExit();
      maxErrors = clampInt(parseInt(v, 10), 1, 5000);
      i++;
      continue;
    }

    if (a.startsWith("-")) usageAndExit();

    file = a;
  }

  if (!file) usageAndExit();

  return { file, quiet, maxErrors };
}

function usageAndExit(): never {
  console.error("Usage: usd-n-verify <log.jsonl> [--quiet|-q] [--max-errors N]");
  process.exit(2);
}

async function readJsonl(path: string): Promise<HashedEvent[]> {
  if (!fs.existsSync(path)) {
    throw new Error(`File not found: ${path}`);
  }

  const stream = fs.createReadStream(path, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  const out: HashedEvent[] = [];
  let lineNo = 0;

  for await (const line of rl) {
    lineNo++;
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const parsed = JSON.parse(trimmed) as HashedEvent;
      out.push(reviveBigints(parsed));
    } catch (err) {
      throw new Error(
        `JSONL_PARSE_ERROR at line ${lineNo}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  return out;
}

/**
 * JSON doesn't support BigInt. If your log encodes bigint fields as strings,
 * this revives them into BigInt.
 *
 * Convention:
 * - any field ending with "_cents" or named "amount" or "total_value_usd" is revived if it is a string
 */
function reviveBigints(e: any): HashedEvent {
  // amount on MINT/BURN
  if ((e?.type === "MINT" || e?.type === "BURN") && typeof e.amount === "string") {
    e.amount = BigInt(e.amount);
  }

  // reserve snapshot totals
  if (e?.type === "RESERVE_SNAPSHOT") {
    if (typeof e.snapshot?.total_value_usd === "string") {
      e.snapshot.total_value_usd = BigInt(e.snapshot.total_value_usd);
    }
    if (e.snapshot?.by_asset_usd) {
      for (const k of Object.keys(e.snapshot.by_asset_usd)) {
        const v = e.snapshot.by_asset_usd[k];
        if (typeof v === "string") e.snapshot.by_asset_usd[k] = BigInt(v);
      }
    }
  }

  return e as HashedEvent;
}

function formatUSD(cents: bigint): string {
  const sign = cents < 0n ? "-" : "";
  const v = cents < 0n ? -cents : cents;
  const dollars = v / 100n;
  const rem = v % 100n;
  return `${sign}$${dollars}.${rem.toString().padStart(2, "0")}`;
}

function clampInt(x: number, min: number, max: number): number {
  if (!Number.isFinite(x)) return min;
  if (x < min) return min;
  if (x > max) return max;
  return x;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
