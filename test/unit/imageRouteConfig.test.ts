import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

describe("Vercel 图片代理路由", () => {
  it("不使用不兼容二进制响应的 ISR 包装", () => {
    const nuxtConfig = readFileSync(resolve(projectRoot, "nuxt.config.ts"), "utf8");
    const vercelConfig = JSON.parse(
      readFileSync(resolve(projectRoot, "vercel.json"), "utf8")
    );

    expect(nuxtConfig).toMatch(/"\/api\/img":\s*\{\s*cache:\s*false\s*\}/);
    expect(nuxtConfig).not.toMatch(/"\/api\/img":\s*\{[^}]*swr:/);
    expect(
      vercelConfig.headers.some((rule: { source: string }) => rule.source === "/api/img")
    ).toBe(false);
  });
});
