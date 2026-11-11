import { describe, expect, it } from "vitest";
import { jsonLd } from "@/lib/json-ld";

describe("jsonLd", () => {
  it("cannot close the script tag", () => {
    const out = jsonLd({ name: "Free Fire </script><script>alert(1)</script> & co" });
    expect(out).not.toContain("</script");
    expect(out).not.toContain("<");
    expect(JSON.parse(out).name).toBe("Free Fire </script><script>alert(1)</script> & co");
  });
});
