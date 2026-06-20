import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("SSR index template", () => {
  it("places initial data before the client entry", () => {
    const html = readFileSync(resolve(process.cwd(), "index.html"), "utf-8");
    const dataIndex = html.indexOf("<!--app-data-->");
    const clientIndex = html.indexOf("/src/entry-client.tsx");

    expect(dataIndex).toBeGreaterThan(-1);
    expect(clientIndex).toBeGreaterThan(-1);
    expect(dataIndex).toBeLessThan(clientIndex);
  });
});
