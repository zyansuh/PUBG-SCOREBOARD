import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "./auth-token";
import { detectImageMime, sha256Hex } from "./image";

describe("session token", () => {
  it("비밀번호가 같으면 통과하고 다르면 거절한다", async () => {
    const token = await createSessionToken("opsn-admin", 1_000);
    await expect(verifySessionToken(token, "opsn-admin", 1_000)).resolves.toBe(true);
    await expect(verifySessionToken(token, "wrong", 1_000)).resolves.toBe(false);
    await expect(verifySessionToken(undefined, "opsn-admin")).resolves.toBe(false);
  });

  it("만료되면 거절한다", async () => {
    const token = await createSessionToken("opsn-admin", 1_000);
    const eightDaysLater = 1_000 + 8 * 24 * 60 * 60 * 1000;
    await expect(verifySessionToken(token, "opsn-admin", eightDaysLater)).resolves.toBe(false);
  });
});

describe("detectImageMime", () => {
  it("JPEG, PNG, WEBP 시그니처만 허용한다", () => {
    expect(detectImageMime(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg");
    expect(
      detectImageMime(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe("image/png");
    const webp = new Uint8Array(12);
    webp.set([0x52, 0x49, 0x46, 0x46], 0);
    webp.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(detectImageMime(webp)).toBe("image/webp");
    expect(detectImageMime(Uint8Array.from([0x00, 0x01, 0x02]))).toBeNull();
  });

  it("같은 바이트는 같은 해시를 만든다", () => {
    const bytes = Uint8Array.from([1, 2, 3, 4]);
    expect(sha256Hex(bytes)).toHaveLength(64);
    expect(sha256Hex(bytes)).toBe(sha256Hex(bytes));
  });
});
