import { describe, expect, it } from "vitest";
import { decryptBytes, encryptBytes } from "@/lib/crypto";

describe("encrypted private files", () => {
  it("round-trips bytes and hides the content", () => {
    process.env.ENCRYPTION_KEY ??= Buffer.alloc(32, 7).toString("base64");
    const photo = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8]);
    const sealed = encryptBytes(photo);
    expect(sealed.includes(photo)).toBe(false);
    expect(decryptBytes(sealed).equals(photo)).toBe(true);
  });

  it("refuses a tampered file", () => {
    const sealed = encryptBytes(Buffer.from("secret"));
    sealed[sealed.length - 1] ^= 1;
    expect(() => decryptBytes(sealed)).toThrow();
  });
});
