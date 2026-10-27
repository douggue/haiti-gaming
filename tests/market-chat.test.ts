import { describe, expect, it } from "vitest";
import { redactContacts } from "@/lib/market-chat";

describe("market chat contact filter", () => {
  it.each([
    ["Rele m 3712 3456", "Rele m •••"],
    ["+509 37-12-34-56 pou peye", "••• pou peye"],
    ["ekri m sou wa.me/50937123456", "ekri m sou •••"],
    ["imel mwen: jean.pierre@gmail.com", "imel mwen: •••"],
    ["jean (at) gmail (dot) com", "•••"],
    ["https://t.me/someone ok", "••• ok"],
    ["WhatsApp: 3712-3456", "•••"],
  ])("hides %s", (input, out) => {
    const r = redactContacts(input);
    expect(r.body).toBe(out);
    expect(r.hidden).toBe(true);
  });

  it.each(["Kont lan nivo 70, 12 skin", "M ka ba w 4500 HTG?", "Rank Heroic, 2 500 dyaman", "ID 123456 la bon?"])("keeps %s", (input) => {
    expect(redactContacts(input)).toEqual({ body: input, hidden: false });
  });
});
