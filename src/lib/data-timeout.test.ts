import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { withDataTimeout } from "./data-timeout";

describe("bounded data loading", () => {
  test("returns live results unchanged", async () => {
    assert.deepEqual(await withDataTimeout(async () => ({ users: 3 }), 50), { users: 3 });
  });
  test("rejects when the connection does not respond", async () => {
    await assert.rejects(withDataTimeout(() => new Promise(() => {}), 10), /No se pudo conectar con Sententia/);
  });
  test("preserves database failures", async () => {
    await assert.rejects(withDataTimeout(async () => { throw new Error("connection refused"); }, 50), /connection refused/);
  });
});