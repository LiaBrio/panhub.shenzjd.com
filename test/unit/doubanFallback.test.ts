import { beforeEach, describe, expect, it, vi } from "vitest";

const mockOfetch = vi.hoisted(() => vi.fn());

vi.mock("ofetch", () => ({
  ofetch: mockOfetch,
}));

const API_ITEM = {
  id: "1292052",
  title: "肖申克的救赎",
  score: "9.7",
  rating: ["9.7"],
  cover_url: "https://img3.doubanio.com/view/photo/s_ratio_poster/public/p2934829882.jpg",
  url: "https://movie.douban.com/subject/1292052/",
  types: ["剧情"],
  regions: ["美国"],
  actors: [],
  release_date: "1994",
  vote_count: 3000000,
  rank: 1,
};

beforeEach(() => {
  vi.resetModules();
  mockOfetch.mockReset();
});

describe("豆瓣榜单 Jina Reader 回退", () => {
  it("JSON API 被拦截时通过 Jina Reader 返回分类榜单", async () => {
    mockOfetch
      .mockRejectedValueOnce(new Error("418 I'm a teapot"))
      .mockResolvedValueOnce(JSON.stringify([API_ITEM]));

    const { fetchDoubanHotByCategory } = await import(
      "../../server/core/services/doubanHotService"
    );
    const result = await fetchDoubanHotByCategory("douban-drama", 1, 1);

    expect(result.items).toEqual([
      expect.objectContaining({
        id: 1292052,
        title: "【9.7】肖申克的救赎",
        cover: API_ITEM.cover_url,
      }),
    ]);
    expect(mockOfetch).toHaveBeenCalledTimes(2);
    expect(mockOfetch.mock.calls[1][0]).toContain(
      "https://r.jina.ai/https://movie.douban.com/j/chart/top_list"
    );
  });

  it("Top250 直连失败时通过 Jina Reader 返回榜单", async () => {
    const markdown = `
      [![Image 1: 肖申克的救赎](${API_ITEM.cover_url})](https://movie.douban.com/subject/1292052/)
      9.7 肖申克的救赎
      希望让人自由。
    `;
    mockOfetch
      .mockRejectedValueOnce(new Error("418 I'm a teapot"))
      .mockResolvedValueOnce(markdown);

    const { fetchDoubanHotByCategory } = await import(
      "../../server/core/services/doubanHotService"
    );
    const result = await fetchDoubanHotByCategory("douban-top250", 1, 1);

    expect(result.items).toEqual([
      expect.objectContaining({
        id: 1292052,
        title: "【9.7】肖申克的救赎",
        cover: API_ITEM.cover_url,
      }),
    ]);
    expect(mockOfetch).toHaveBeenCalledTimes(2);
    expect(mockOfetch.mock.calls[1][0]).toBe(
      "https://r.jina.ai/https://movie.douban.com/top250"
    );
  });
});
