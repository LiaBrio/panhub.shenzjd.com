import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("B3 Editorial Library 视觉重构", () => {
  it("定义暖白杂志主题与展示字体令牌", () => {
    const globalCss = read("assets/css/global.css");

    expect(globalCss).toContain("--font-display:");
    expect(globalCss).toContain("--accent-editorial:");
    expect(globalCss).toContain("--bg-paper:");
  });

  it("首页将搜索置于编辑式首屏并在搜索后收起发现内容", () => {
    const home = read("pages/index/index.vue");

    expect(home).toContain(':class="{ \'home--searched\': searched }"');
    expect(home).toContain('class="editorial-hero"');
    expect(home).toContain('class="archive-kicker"');
    expect(home).toContain('class="discovery-grid"');
    expect(home).toMatch(/<section v-if="!searched" class="editorial-hero"[\s\S]*?<SearchBox/);
  });

  it("豆瓣首张海报采用画廊主卡布局", () => {
    const douban = read("components/DoubanHotSection.vue");

    expect(douban).toContain('class="card-rank"');
    expect(douban).toMatch(/\.movie-card:first-child\s*\{[^}]*grid-column:\s*span 2;/s);
    expect(douban).toMatch(/\.movie-card:first-child\s+\.card-info\s*\{/);
  });

  it("深色模式提供同一编辑主题的夜间配色", () => {
    const darkCss = read("public/css/dark-mode.css");

    expect(darkCss).toContain("--accent-editorial:");
    expect(darkCss).toContain("--bg-paper:");
    expect(darkCss).toContain("Editorial Library");
  });
});
