import { describe, expect, it } from "vitest";
import { cleanPath, detectSource, isBot, parseDevice, productSlugOf, visitorHash } from "@/lib/analytics";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; SM-A146U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";
const IPAD = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0";

describe("visitor statistics", () => {
  it("reads the device, browser and system", () => {
    expect(parseDevice(IPHONE)).toEqual({ device: "phone", browser: "Safari", os: "iOS" });
    expect(parseDevice(ANDROID)).toEqual({ device: "phone", browser: "Chrome", os: "Android" });
    expect(parseDevice(IPAD).device).toBe("tablet");
    expect(parseDevice(WINDOWS)).toEqual({ device: "desktop", browser: "Edge", os: "Windows" });
    expect(parseDevice("Mozilla/5.0 (Linux; Android 14) [FBAN/FB4A;FBAV/450.0] Mobile").browser).toBe("Facebook/Instagram app");
  });

  it("leaves out bots and link previews", () => {
    expect(isBot("Googlebot/2.1 (+http://www.google.com/bot.html)")).toBe(true);
    expect(isBot("WhatsApp/2.23.20.0 A")).toBe(true);
    expect(isBot("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)")).toBe(true);
    expect(isBot("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0 Safari/537.36")).toBe(true);
    expect(isBot("curl/8.4.0")).toBe(true);
    expect(isBot("")).toBe(true);
    expect(isBot(IPHONE)).toBe(false);
    expect(isBot(ANDROID)).toBe(false);
  });

  it("finds where the visit came from", () => {
    expect(detectSource("l.facebook.com")).toBe("facebook");
    expect(detectSource("l.instagram.com")).toBe("instagram");
    expect(detectSource(null, "whatsapp")).toBe("whatsapp");
    expect(detectSource("www.google.com")).toBe("google");
    expect(detectSource("www.tiktok.com")).toBe("tiktok");
    expect(detectSource(null)).toBe("direct");
    expect(detectSource("www.haitigaming.net", null, "haitigaming.net")).toBe("direct");
    expect(detectSource("blog.example.com")).toBe("other");
  });

  it("counts a visitor without keeping the IP", () => {
    const a = visitorHash("190.115.1.2", IPHONE, "secret", "2026-11-11");
    expect(a).toMatch(/^[0-9a-f]{32}$/);
    expect(a).not.toContain("190");
    expect(visitorHash("190.115.1.2", IPHONE, "secret", "2026-11-11")).toBe(a); // same day: same visitor
    expect(visitorHash("190.115.1.2", IPHONE, "secret", "2026-11-12")).not.toBe(a); // next day: a new code
    expect(visitorHash("190.115.1.2", IPHONE, "other-secret", "2026-11-11")).not.toBe(a);
  });

  it("keeps only clean public paths", () => {
    expect(cleanPath("/ht/store?q=free&x=1")).toBe("/ht/store");
    expect(cleanPath("/admin/orders")).toBeNull();
    expect(cleanPath("/api/a")).toBeNull();
    expect(cleanPath("https://evil.example")).toBeNull();
    expect(cleanPath(42)).toBeNull();
    expect(cleanPath("/ht/account/orders/cmw123abc")).toBe("/ht/account/orders/…");
    expect(cleanPath("/ht/gift/secret-token")).toBe("/ht/gift/…");
    expect(cleanPath("/fr/order-status/abc?t=xyz")).toBe("/fr/order-status/…");
    expect(cleanPath("/ht/market")).toBe("/ht/market");
    expect(cleanPath("/ht/market/sell")).toBe("/ht/market/sell");
    expect(cleanPath("/ht/market/cmvr170rl0006jp08mk40w1lf")).toBe("/ht/market/…");
    expect(productSlugOf("/ht/products/free-fire-diamonds")).toBe("free-fire-diamonds");
    expect(productSlugOf("/ht/store")).toBeNull();
  });
});
