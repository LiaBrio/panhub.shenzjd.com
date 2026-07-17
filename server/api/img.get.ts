import { defineEventHandler, getQuery, createError, setHeader } from "h3";
import { ofetch } from "ofetch";

const ALLOWED_HOSTS = /^img[1-9]\.doubanio\.com$/;

const CACHE_CONTROL =
  "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";
const CDN_CACHE_CONTROL = "public, s-maxage=604800";

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const raw = (query.url as string) || "";
  const url = decodeURIComponent(raw);

  if (!url || !url.startsWith("https://")) {
    setHeader(event, "Cache-Control", "no-store");
    throw createError({ statusCode: 400, statusMessage: "Invalid url" });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    setHeader(event, "Cache-Control", "no-store");
    throw createError({ statusCode: 400, statusMessage: "Invalid url" });
  }

  if (!ALLOWED_HOSTS.test(parsed.hostname)) {
    setHeader(event, "Cache-Control", "no-store");
    throw createError({ statusCode: 403, statusMessage: "Host not allowed" });
  }

  // 防止 SSRF 绕过：URL 中不得包含用户信息段或非标准端口
  if (parsed.username || parsed.password || parsed.port) {
    setHeader(event, "Cache-Control", "no-store");
    throw createError({ statusCode: 403, statusMessage: "Host not allowed" });
  }

  try {
    const resp = await ofetch<ArrayBuffer>(url, {
      responseType: "arrayBuffer",
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        "Referer": "https://movie.douban.com/",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
      },
      timeout: 15000,
      retry: 1,
      retryDelay: 1000,
    });

    const buffer = Buffer.from(resp);
    const ext = parsed.pathname.split(".").pop()?.toLowerCase() || "jpg";
    const mime =
      ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";

    setHeader(event, "Content-Type", mime);
    setHeader(event, "Content-Length", buffer.byteLength);
    setHeader(event, "Cache-Control", CACHE_CONTROL);
    setHeader(event, "CDN-Cache-Control", CDN_CACHE_CONTROL);
    setHeader(event, "Vary", "Accept");
    setHeader(event, "X-Content-Type-Options", "nosniff");
    return buffer;
  } catch (error: any) {
    // 失败响应禁止被边缘/浏览器缓存，避免错误结果污染长效缓存
    setHeader(event, "Cache-Control", "no-store");
    throw createError({
      statusCode: 503,
      statusMessage: "Image fetch timeout",
    });
  }
});
