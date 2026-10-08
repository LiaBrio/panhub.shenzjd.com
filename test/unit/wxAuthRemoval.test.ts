import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

describe("微信公众号认证移除", () => {
  it("搜索页和依赖中不再包含公众号认证逻辑", () => {
    const composablePath = resolve(projectRoot, "composables/useWxAuth.ts");
    const searchPage = readFileSync(
      resolve(projectRoot, "pages/index/index.vue"),
      "utf8"
    );
    const packageJson = JSON.parse(
      readFileSync(resolve(projectRoot, "package.json"), "utf8")
    );

    expect(existsSync(composablePath)).toBe(false);
    expect(searchPage).not.toMatch(/useWxAuth|checkSearchAuth/);
    expect(packageJson.dependencies).not.toHaveProperty("wx-auth-sdk");
  });
});
