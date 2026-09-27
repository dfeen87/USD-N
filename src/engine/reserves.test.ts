import test from "node:test";
import assert from "node:assert/strict";
import { makeReserveSnapshot } from "./reserves.js";

test("makeReserveSnapshot rejects BTC reserve larger than total reserves", () => {
  assert.throws(
    () => {
      makeReserveSnapshot("2024-01-01T00:00:00Z", 1_000n, 2_000n);
    },
    {
      message: "INVARIANT_FAIL: BTC reserve exceeds total reserves"
    }
  );
});

test("makeReserveSnapshot rejects negative reserve values", () => {
  assert.throws(
    () => makeReserveSnapshot("2024-01-01T00:00:00Z", -1n),
    { message: "INVARIANT_FAIL: reserve values must be non-negative" }
  );
  assert.throws(
    () => makeReserveSnapshot("2024-01-01T00:00:00Z", 1_000n, -1n),
    { message: "INVARIANT_FAIL: reserve values must be non-negative" }
  );
});
