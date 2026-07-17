import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock ofetch before importing the handler
const mockOfetch = vi.fn();
vi.mock("ofetch", () => ({
  ofetch: (...args: any[]) => mockOfetch(...args),
}));

// Mock h3 — the handler under test only uses defineEventHandler / getQuery /
// createError / setHeader. We stub them so we can invoke the handler with a
// fabricated event and inspect the header side-effects.
type MockEvent = { __headers: Record<string, string | number>; __query: Record<string, string> };

vi.mock("h3", () => ({
  defineEventHandler: (fn: any) => fn,
  getQuery: (event: MockEvent) => event.__query,
  setHeader: (event: MockEvent, name: string, value: string | number) => {
    event.__headers[name] = value;
  },
  createError: (opts: { statusCode: number; statusMessage?: string }) => {
    const err: any = new Error(opts.statusMessage || `HTTP ${opts.statusCode}`);
    err.statusCode = opts.statusCode;
    return err;
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
import handler from "../../server/api/img.get";

const DOUBAN_URL =
  "https://img9.doubanio.com/view/photo/s_ratio_poster/public/p12345.jpg";

function makeEvent(url: string): MockEvent {
  return {
    __headers: {},
    __query: { url: encodeURIComponent(url) },
  };
}

describe("/api/img cache headers", () => {
  beforeEach(() => {
    mockOfetch.mockReset();
  });

  it("returns long-lived edge cache headers on success", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]).buffer;
    mockOfetch.mockResolvedValueOnce(bytes);

    const event = makeEvent(DOUBAN_URL);
    const result: any = await (handler as any)(event);

    expect(result).toBeInstanceOf(Buffer);
    const cc = String(event.__headers["Cache-Control"] || "");
    expect(cc).toContain("public");
    expect(cc).toContain("s-maxage=86400");
    expect(cc).toContain("stale-while-revalidate=604800");
    expect(event.__headers["CDN-Cache-Control"]).toBe(
      "public, s-maxage=604800"
    );
    expect(event.__headers["Content-Type"]).toBe("image/jpeg");
    expect(event.__headers["Content-Length"]).toBe(bytes.byteLength);
  });

  it("marks upstream failure responses as no-store", async () => {
    mockOfetch.mockRejectedValueOnce(new Error("timeout"));

    const event = makeEvent(DOUBAN_URL);
    await expect((handler as any)(event)).rejects.toMatchObject({
      statusCode: 503,
    });
    expect(event.__headers["Cache-Control"]).toBe("no-store");
  });

  it("rejects hosts outside the doubanio allowlist with no-store", async () => {
    const event = makeEvent("https://evil.example.com/x.jpg");
    await expect((handler as any)(event)).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(event.__headers["Cache-Control"]).toBe("no-store");
    expect(mockOfetch).not.toHaveBeenCalled();
  });

  it("rejects non-https URLs with no-store", async () => {
    const event = makeEvent("http://img9.doubanio.com/a.jpg");
    await expect((handler as any)(event)).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(event.__headers["Cache-Control"]).toBe("no-store");
  });
});
