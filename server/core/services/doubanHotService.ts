/**
 * 豆瓣影视榜单服务
 * 使用豆瓣 JSON API (/j/chart/top_list) 获取数据，替代 HTML 爬虫
 *
 * 优点：返回结构化 JSON，无需 cheerio 解析，自带封面 URL，更稳定
 */

import { ofetch } from "ofetch";
import { load } from "cheerio";
import { DOUBAN_HOT_SOURCES, type DoubanHotSourceConfig } from "../../../config/doubanHot";
import { MemoryCache } from "../cache/memoryCache";

export interface DoubanHotItem {
  id?: number;
  title: string;
  url?: string;
  cover?: string;
  desc?: string;
  hot?: number;
}

export interface DoubanHotPageResult {
  items: DoubanHotItem[];
  hasMore: boolean;
}

/** 豆瓣 top_list API 返回的原始结构 */
interface DoubanApiItem {
  id: string;
  title: string;
  score: string;
  rating: string[];
  cover_url: string;
  url: string;
  types: string[];
  regions: string[];
  actors: string[];
  release_date: string;
  vote_count: number;
  rank: number;
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 小时（榜单一天更新一次即可）
const API_BASE = "https://movie.douban.com/j/chart/top_list";
const JINA_READER_BASE = "https://r.jina.ai/";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";
const PAGE_SIZE = 20;

const allItemsCache = new MemoryCache<DoubanHotItem[]>({ maxSize: 30 });

function extractReaderContent(payload: unknown): string {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return "";

  const value = payload as { content?: unknown; data?: { content?: unknown } };
  if (typeof value.data?.content === "string") return value.data.content;
  return typeof value.content === "string" ? value.content : "";
}

function parseJinaJsonItems(payload: unknown): DoubanApiItem[] {
  if (Array.isArray(payload)) return payload as DoubanApiItem[];

  const content = extractReaderContent(payload);
  const start = content.indexOf("[");
  const end = content.lastIndexOf("]");
  if (start < 0 || end <= start) return [];

  try {
    const parsed = JSON.parse(content.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function fetchTopListPage(url: string): Promise<DoubanApiItem[]> {
  try {
    const data = await ofetch<DoubanApiItem[]>(url, {
      headers: { "user-agent": UA },
      timeout: 10000,
    });
    if (Array.isArray(data) && data.length > 0) return data;
  } catch (error: any) {
    console.warn(`[DoubanAPI] 直连失败，切换 Jina Reader:`, error?.message);
  }

  try {
    const payload = await ofetch<unknown>(`${JINA_READER_BASE}${url}`, {
      headers: {
        "user-agent": UA,
        "X-Return-Format": "text",
        "X-No-Cache": "true",
      },
      timeout: 20000,
    });
    return parseJinaJsonItems(payload);
  } catch (error: any) {
    console.warn(`[DoubanAPI] Jina Reader 回退失败:`, error?.message);
    return [];
  }
}

/** 将豆瓣 API 返回的 item 转为 DoubanHotItem */
function mapItem(raw: DoubanApiItem, index: number): DoubanHotItem {
  const score = raw.score || raw.rating?.[0] || "";
  const title = score ? `【${score}】${raw.title}` : raw.title;
  const desc = [raw.types?.join("/"), raw.regions?.join("/")]
    .filter(Boolean)
    .join(" · ");

  return {
    id: Number(raw.id) || undefined,
    title,
    cover: raw.cover_url || undefined,
    desc,
    url: raw.url || `https://movie.douban.com/subject/${raw.id}/`,
  };
}

/**
 * 从豆瓣 JSON API 获取指定类型的榜单
 * @param typeId 豆瓣分类 ID（0=Top250, 3=剧情, 5=动作, ...）
 * @param limit 获取数量
 */
async function fetchTopList(typeId: number, limit = 50): Promise<DoubanHotItem[]> {
  const allItems: DoubanHotItem[] = [];
  const batchSize = Math.min(limit, PAGE_SIZE);

  for (let start = 0; start < limit; start += batchSize) {
    const url = `${API_BASE}?type=${typeId}&interval_id=100:90&action=&start=${start}&limit=${batchSize}`;

    const data = await fetchTopListPage(url);
    if (data.length === 0) break;

    for (let i = 0; i < data.length; i++) {
      allItems.push(mapItem(data[i], start + i));
    }

    // 如果返回的数据少于请求数，说明没有更多了
    if (data.length < batchSize) break;
  }

  return allItems;
}

/**
 * Top250 专用爬虫（该分类不支持 JSON API，需爬 HTML）
 */
function parseTop250Html(html: string): DoubanHotItem[] {
  const items: DoubanHotItem[] = [];
  const $ = load(html);

  $(".article ol.grid_view li").each((_, el) => {
    const dom = $(el);
    const href = dom.find(".pic a").attr("href") || "";
    const id = Number(href.match(/\d+/)?.[0]) || undefined;
    const rawTitle = dom.find(".info .title").first().text() || "";
    const score = dom.find(".info .rating_num").text().trim() || "0.0";
    const title = rawTitle ? `【${score}】${rawTitle}` : "";
    if (!title) return;

    const img = dom.find("img");
    const cover = img.attr("data-src") || img.attr("src") || undefined;
    const coverUrl = cover?.startsWith("//") ? "https:" + cover : cover;

    items.push({
      id,
      title,
      cover: coverUrl,
      desc: dom.find(".info .inq").text().trim(),
      url: href || `https://movie.douban.com/subject/${id}/`,
    });
  });

  return items;
}

function parseTop250Markdown(markdown: string): DoubanHotItem[] {
  const items: DoubanHotItem[] = [];
  const pattern = /\[!\[([^\]]*)\]\((https:\/\/img[1-9]\.doubanio\.com\/[^)\s]+)\)\]\((https:\/\/movie\.douban\.com\/subject\/(\d+)\/?)\)/g;

  for (const match of markdown.matchAll(pattern)) {
    const rawTitle = match[1].replace(/^Image\s*\d*\s*:\s*/i, "").trim();
    const followingText = markdown.slice((match.index || 0) + match[0].length, (match.index || 0) + match[0].length + 200);
    const score = followingText.match(/\b(10(?:\.0)?|[0-9]\.[0-9])\b/)?.[1] || "0.0";
    if (!rawTitle) continue;

    items.push({
      id: Number(match[4]) || undefined,
      title: `【${score}】${rawTitle}`,
      cover: match[2],
      url: match[3],
    });
  }

  return items;
}

async function fetchTop250Page(url: string): Promise<DoubanHotItem[]> {
  const UA_LOCAL = "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15";

  try {
    const html = await ofetch<string>(url, {
      headers: { "user-agent": UA_LOCAL },
      timeout: 10000,
    });
    const items = parseTop250Html(html);
    if (items.length > 0) return items;
  } catch (error: any) {
    console.warn(`[DoubanTop250] 直连失败，切换 Jina Reader:`, error?.message);
  }

  try {
    const payload = await ofetch<unknown>(`${JINA_READER_BASE}${url}`, {
      headers: {
        "user-agent": UA_LOCAL,
        "X-Return-Format": "markdown",
        "X-No-Cache": "true",
      },
      timeout: 20000,
    });
    const content = extractReaderContent(payload);
    const htmlItems = parseTop250Html(content);
    return htmlItems.length > 0 ? htmlItems : parseTop250Markdown(content);
  } catch (error: any) {
    console.warn(`[DoubanTop250] Jina Reader 回退失败:`, error?.message);
    return [];
  }
}

async function scrapeTop250(): Promise<DoubanHotItem[]> {
  const allItems: DoubanHotItem[] = [];

  for (let page = 0; page < 10; page++) {
    const start = page * 25;
    const url = start === 0
      ? "https://movie.douban.com/top250"
      : `https://movie.douban.com/top250?start=${start}`;
    const pageItems = await fetchTop250Page(url);

    allItems.push(...pageItems);
    if (pageItems.length < 25) break;
    if (page < 9) await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return allItems;
}

/** 获取指定分类的全部数据（带缓存） */
async function fetchAllItems(categoryId: string): Promise<DoubanHotItem[]> {
  const cacheKey = `douban-api:${categoryId}`;
  const cached = allItemsCache.get(cacheKey);
  if (cached.hit && cached.value) return cached.value;

  const config = DOUBAN_HOT_SOURCES.find((s) => s.id === categoryId);
  if (!config) return [];

  // Top250 不支持 JSON API，用独立爬虫
  const items = config.typeId === -1
    ? await scrapeTop250()
    : await fetchTopList(config.typeId);
  if (items.length > 0) {
    allItemsCache.set(cacheKey, items, CACHE_TTL_MS);
  }
  return items;
}

export function extractSearchTerm(title: string): string {
  return title.replace(/^【[\d.]+】/, "").trim() || title;
}

/** 分页获取指定分类的数据 */
export async function fetchDoubanHotByCategory(
  category: string,
  page: number = 1,
  limit: number = PAGE_SIZE
): Promise<DoubanHotPageResult> {
  const allItems = await fetchAllItems(category);
  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    items: allItems.slice(start, end),
    hasMore: end < allItems.length,
  };
}

/** 获取所有分类的数据 */
export async function fetchDoubanHot(
  categories?: string[]
): Promise<{ categories: Record<string, { id: string; label: string; title: string; type: string; items: DoubanHotItem[] }> }> {
  const ids = categories?.length
    ? categories
    : DOUBAN_HOT_SOURCES.map((s) => s.id);

  const results: Record<string, { id: string; label: string; title: string; type: string; items: DoubanHotItem[] }> = {};

  await Promise.all(
    ids.map(async (id) => {
      const config = DOUBAN_HOT_SOURCES.find((s) => s.id === id);
      if (!config) return;

      try {
        const items = await fetchAllItems(id);
        results[id] = {
          id: config.id,
          label: config.label,
          title: config.label,
          type: config.type,
          items,
        };
      } catch (e: any) {
        results[id] = {
          id: config.id,
          label: config.label,
          title: config.label,
          type: config.type,
          items: [],
        };
        console.warn(`[DoubanAPI] ${id} 失败:`, e?.message);
      }
    })
  );

  return { categories: results };
}
