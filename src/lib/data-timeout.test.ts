import { describe, expect, test } from "bun:test";
import { withDataTimeout } from "./data-timeout";

describe("bounded data loading", () => {
  test("returns live results unchanged", async () => {
    expect(await withDataTimeout(async () => ({ users: 3 }), 50)).toEqual({ users: 3 });
  });
  test("rejects when the connection does not respond", async () => {
    await expect(withDataTimeout(() => new Promise(() => {}), 10)).rejects.toThrow("No se pudo conectar con Sententia");
  });
  test("preserves database failures", async () => {
    await expect(withDataTimeout(async () => { throw new Error("connection refused"); }, 50)).rejects.toThrow("connection refused");
  });
});