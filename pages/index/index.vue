<template>
  <div class="home" :class="{ 'home--searched': searched }">
    <!-- 编辑式首屏：搜索始终是第一任务 -->
    <section v-if="!searched" class="editorial-hero" aria-labelledby="archive-title">
      <div class="hero-rule" aria-hidden="true">
        <span>VOL. 09</span>
        <span>CURATED DAILY</span>
      </div>
      <div class="hero-content">
        <p class="archive-kicker">PANHUB EDITORIAL LIBRARY</p>
        <h1 id="archive-title" class="hero-title">光影收藏室</h1>
        <p class="hero-description">
          从正在热映到经典高分，在内容与资源之间自由探索
        </p>
      </div>
      <SearchBox
        v-model="kw"
        :loading="searchState.loading"
        :paused="searchState.paused"
        :searched="searched"
        :placeholder="placeholder"
        @search="onSearch"
        @reset="fullReset"
        @pause="pauseSearch"
        @continue="handleContinueSearch" />
      <div class="hero-shortcuts" aria-label="热门分类">
        <button type="button" @click="quickSearch('正在热映')">正在热映</button>
        <button type="button" @click="quickSearch('豆瓣高分')">豆瓣高分</button>
        <button type="button" @click="quickSearch('热门剧集')">热门剧集</button>
        <button type="button" @click="quickSearch('高分纪录片')">高分纪录片</button>
      </div>
    </section>

    <!-- 搜索后收起发现内容，保持紧凑搜索入口 -->
    <section v-else class="results-search" aria-label="搜索工具">
      <div>
        <p class="archive-kicker">SEARCH RESULTS</p>
        <h1 class="results-title">资源检索</h1>
      </div>
      <SearchBox
        v-model="kw"
        :loading="searchState.loading"
        :paused="searchState.paused"
        :searched="searched"
        :placeholder="placeholder"
        @search="onSearch"
        @reset="fullReset"
        @pause="pauseSearch"
        @continue="handleContinueSearch" />
    </section>

    <!-- 统计和过滤器 -->
    <div v-if="searched" class="stats-bar">
      <div class="stats-content">
        <div class="stats-main">
          <span class="stat-item">
            <span class="stat-label">结果</span>
            <span class="stat-value">{{ searchState.total }}</span>
          </span>
          <span class="stat-item">
            <span class="stat-label">用时</span>
            <span class="stat-value">{{ searchState.elapsedMs }}ms</span>
          </span>
          <span v-if="searchState.deepLoading && !searchState.paused" class="loading-indicator">
            <span class="pulse-dot"></span>
            <span class="loading-text">持续搜索中…</span>
          </span>
          <span v-if="searchState.paused" class="paused-indicator-bar">
            <span class="pause-icon">⏸</span>
            <span class="paused-text">搜索已暂停</span>
          </span>
        </div>

        <!-- 平台过滤器 -->
        <div class="platform-filters" v-if="hasResults">
          <button
            :class="['filter-pill', { active: filterPlatform === 'all' }]"
            @click="filterPlatform = 'all'">
            全部 ({{ searchState.total }})
          </button>
          <button
            v-for="p in platforms"
            :key="p"
            :class="['filter-pill', { active: filterPlatform === p }]"
            @click="filterPlatform = p">
            {{ platformName(p) }} ({{ searchState.merged[p]?.length || 0 }})
          </button>
        </div>

        <!-- 排序选择器 -->
        <div class="sorter" v-if="hasResults">
          <select v-model="sortType" class="sort-select">
            <option value="default">默认排序</option>
            <option value="date-desc">最新发布</option>
            <option value="date-asc">最早发布</option>
            <option value="name-asc">名称 A→Z</option>
            <option value="name-desc">名称 Z→A</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 搜索结果 -->
    <section v-if="hasResults" class="results-section">
      <div class="results-grid">
        <ResultGroup
          v-for="group in groupedResults"
          :key="group.type"
          :title="platformName(group.type)"
          :color="platformColor(group.type)"
          :icon="platformIcon(group.type)"
          :items="visibleSorted(group.items)"
          :expanded="filterPlatform !== 'all' || isExpanded(group.type)"
          :initial-visible="initialVisible"
          :can-toggle-collapse="false"
          @toggle="handleToggle(group.type)"
          @copy="copyLink" />
      </div>
    </section>

    <!-- 空状态：仅当搜索完全结束且无结果时显示，搜索进行中不显示 -->
    <section v-else-if="searched && !searchState.loading && !searchState.deepLoading && !searchState.paused" class="empty-state">
      <div class="empty-card">
        <div class="empty-icon">🔍</div>
        <h3>未找到相关资源</h3>
        <p>试试其他关键词，或检查设置中的搜索来源是否已启用</p>
        <div v-if="hotTerms.length > 0" class="empty-suggestions">
          <span class="empty-suggestions__label">大家都在搜：</span>
          <button
            v-for="term in hotTerms.slice(0, 5)"
            :key="term"
            class="empty-suggestions__tag"
            @click="quickSearch(term)">
            {{ term }}
          </button>
        </div>
      </div>
    </section>

    <!-- 错误提示 -->
    <section v-if="searchState.error" class="error-alert">
      <span class="error-icon">⚠️</span>
      <span>{{ searchState.error }}</span>
    </section>

    <!-- 编辑式发现区 - 搜索时隐藏 -->
    <div v-if="!searched" class="discovery-grid">
      <section class="douban-hot-section" aria-labelledby="douban-heading">
        <header class="section-heading">
          <div>
            <p class="section-kicker">THE SCREENING ROOM</p>
            <h2 id="douban-heading">豆瓣高分精选</h2>
          </div>
          <span>点击海报直接搜索资源</span>
        </header>
        <ErrorBoundary message="豆瓣热榜加载失败">
          <DoubanHotSection ref="doubanHotRef" :on-search="quickSearch" />
        </ErrorBoundary>
      </section>
      <aside class="trending-section" aria-labelledby="trending-heading">
        <header class="section-heading section-heading--compact">
          <div>
            <p class="section-kicker">TRENDING NOW</p>
            <h2 id="trending-heading">大家正在找</h2>
          </div>
        </header>
        <ErrorBoundary message="热搜加载失败">
          <HotSearchSection ref="hotSearchRef" :on-search="quickSearch" />
        </ErrorBoundary>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from "vue";
import { PLATFORM_INFO } from "~/config/plugins";

const config = useRuntimeConfig();
const apiBase = (config.public?.apiBase as string) || "/api";
const siteUrl = (config.public?.siteUrl as string) || "";
const route = useRoute();
const router = useRouter();

// 热搜组件引用
const hotSearchRef = ref<InstanceType<typeof HotSearchSection> | null>(null);
const doubanHotRef = ref<InstanceType<typeof DoubanHotSection> | null>(null);

// 页面加载时初始化热搜数据
onMounted(async () => {
  await nextTick();
  // 从 URL 读取搜索关键词
  const q = route.query.q;
  if (q && typeof q === "string") {
    kw.value = q;
    await doSearch();
  }
  if (doubanHotRef.value) await doubanHotRef.value.init();
  if (hotSearchRef.value) await hotSearchRef.value.init();
  fetchHotTerms();
});

// SEO 元数据
useSeoMeta({
  title: "PanHub - 全网最全的网盘搜索",
  description:
    "聚合阿里云盘、夸克、百度网盘、115、迅雷等平台，实时检索各类分享链接与资源，免费、快速、无广告。",
  ogTitle: "PanHub - 全网最全的网盘搜索",
  ogDescription:
    "聚合阿里云盘、夸克、百度网盘、115、迅雷等平台，实时检索各类分享链接与资源，免费、快速、无广告。",
  ogType: "website",
  ogSiteName: "PanHub",
  ogImage: siteUrl ? `${siteUrl}/og.svg` : "/og.svg",
  twitterCard: "summary_large_image",
  twitterTitle: "PanHub - 全网最全的网盘搜索",
  twitterDescription:
    "聚合阿里云盘、夸克、百度网盘、115、迅雷等平台，实时检索各类分享链接与资源，免费、快速、无广告。",
  twitterImage: siteUrl ? `${siteUrl}/og.svg` : "/og.svg",
});

useHead({
  link: [{ rel: "canonical", href: siteUrl ? `${siteUrl}/` : "/" }],
  meta: [
    {
      name: "keywords",
      content:
        "网盘搜索, 阿里云盘搜索, 夸克网盘搜索, 百度网盘搜索, 115 网盘, 迅雷云盘, 资源搜索, 盘搜, PanHub",
    },
  ],
  script: [
    {
      type: "application/ld+json",
      innerHTML: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "PanHub",
        url: siteUrl || "",
        potentialAction: {
          "@type": "SearchAction",
          target: (siteUrl || "") + "/?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      }),
    },
  ],
});

// 搜索相关状态
const kw = ref("");
const placeholder =
  "搜索网盘资源，支持百度云、阿里云盘、夸克网盘、115网盘、迅雷云盘、天翼云盘、123网盘、移动云盘、UC网盘等";

// 排序和过滤
const sortType = ref<"default" | "date-desc" | "date-asc" | "name-asc" | "name-desc">("default");
const filterPlatform = ref<string>("all");
const initialVisible = 3;
const expandedSet = ref<Set<string>>(new Set());

// 空状态热搜推荐
const hotTerms = ref<string[]>([]);

async function fetchHotTerms() {
  try {
    const res = await fetch("/api/hot-searches?limit=5");
    const data = await res.json();
    if (data.code === 0) {
      hotTerms.value = data.data.hotSearches.map((s: any) => s.term);
    }
  } catch {}
}

// 使用搜索 composable
const {
  state: searchState,
  searched,
  performSearch,
  resetSearch,
  copyLink,
  pauseSearch,
  continueSearch,
  hasResults,
} = useSearch();
const { settings, loadSettings } = useSettings();
const auth = useAuth();
const requestUnlock = inject<(onSuccess?: () => void) => void>("requestUnlock");

// 获取搜索选项（使用最新的用户设置）
function getSearchOptions() {
  return {
    apiBase,
    keyword: kw.value,
    settings: {
      enabledPlugins: settings.value.enabledPlugins,
      enabledTgChannels: settings.value.enabledTgChannels,
      concurrency: settings.value.concurrency,
      pluginTimeoutMs: settings.value.pluginTimeoutMs,
    },
  };
}

// 记录热搜词
async function recordHotSearch(keyword: string) {
  const term = keyword?.trim();
  if (!term) return;
  try {
    await $fetch(`${apiBase}/hot-searches`, { method: "POST", body: { term } });
  } catch (_e) {}
}

// 执行实际搜索逻辑（供 requestUnlock 回调复用）
async function doSearch() {
  if (!kw.value || searchState.value.loading) return;
  loadSettings();
  const keyword = kw.value.trim();
  recordHotSearch(keyword);
  // 同步搜索词到 URL
  if (router) {
    router.replace({ query: { q: keyword } });
  }
  await performSearch({
    ...getSearchOptions(),
    onAuthRequired: requestUnlock ?? undefined,
  });
}

// 搜索执行
async function onSearch() {
  if (!kw.value || searchState.value.loading) return;
  if (auth.locked.value && requestUnlock) {
    requestUnlock(doSearch);
    return;
  }
  await doSearch();
}

// 快速搜索
async function quickSearch(keyword: string) {
  kw.value = keyword;
  await onSearch();
}

// 继续搜索（从暂停处继续）
async function handleContinueSearch() {
  if (!searchState.value.paused) return;
  if (auth.locked.value && requestUnlock) {
    requestUnlock(async () => {
      loadSettings();
      await continueSearch({
        ...getSearchOptions(),
        onAuthRequired: requestUnlock ?? undefined,
      });
    });
    return;
  }
  loadSettings();
  await continueSearch({
    ...getSearchOptions(),
    onAuthRequired: requestUnlock ?? undefined,
  });
}

// 完全重置 - 清空输入框、结果、状态，并刷新页面
async function fullReset() {
  // 清空输入框和重置状态
  kw.value = "";
  sortType.value = "default";
  filterPlatform.value = "all";
  expandedSet.value = new Set();
  resetSearch();
  // 清除 URL 参数
  if (router) {
    router.replace({ query: {} });
  }
  // 刷新页面以恢复初始状态（包括豆瓣电影）
  await nextTick();
  if (doubanHotRef.value) await doubanHotRef.value.init();
  if (hotSearchRef.value) await hotSearchRef.value.refresh();
}

// 平台信息
const platformIcon = (t: string): string => PLATFORM_INFO[t]?.icon || "📦";
const platformName = (t: string): string => PLATFORM_INFO[t]?.name || t;
const platformColor = (t: string): string => PLATFORM_INFO[t]?.color || "#9ca3af";

// 获取所有有结果的平台类型
const platforms = computed(() => {
  const m = searchState.value?.merged ?? {};
  return Object.keys(m).filter((type) => (m[type]?.length ?? 0) > 0);
});

const groupedResults = computed(() => {
  const list: Array<{ type: string; items: any[] }> = [];
  const source =
    filterPlatform.value === "all"
      ? searchState.value.merged
      : { [filterPlatform.value]: searchState.value.merged[filterPlatform.value] || [] };
  for (const type of Object.keys(source)) {
    if (!source[type]?.length) continue;
    list.push({ type, items: source[type] || [] });
  }
  return list;
});

// 展开/收起
function isExpanded(type: string) {
  return expandedSet.value.has(type);
}

function handleToggle(type: string) {
  filterPlatform.value = type;
}

function visibleItems(type: string, items: any[]) {
  return isExpanded(type) ? items : items.slice(0, initialVisible);
}

// 排序
function sortItems(items: any[]) {
  const arr = [...items];
  switch (sortType.value) {
    case "date-desc":
      return arr.sort(
        (a, b) =>
          new Date(b.datetime || "1970-01-01").getTime() -
          new Date(a.datetime || "1970-01-01").getTime()
      );
    case "date-asc":
      return arr.sort(
        (a, b) =>
          new Date(a.datetime || "1970-01-01").getTime() -
          new Date(b.datetime || "1970-01-01").getTime()
      );
    case "name-asc":
      return arr.sort((a, b) =>
        String(a.note || "").localeCompare(String(b.note || ""), "zh-CN")
      );
    case "name-desc":
      return arr.sort((a, b) =>
        String(b.note || "").localeCompare(String(a.note || ""), "zh-CN")
      );
    default:
      return items;
  }
}

function visibleSorted(items: any[]) {
  return sortItems(items);
}
</script>

<style scoped>
.home {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.home--searched {
  gap: 20px;
}

/* B3 Editorial Library 首屏 */
.editorial-hero {
  position: relative;
  padding: 20px 48px 30px;
  background: var(--bg-paper);
  border: 1px solid var(--border-medium);
  box-shadow: var(--shadow-md);
  text-align: center;
  overflow: hidden;
}

.editorial-hero::before {
  content: "";
  position: absolute;
  inset: 8px;
  border: 1px solid var(--border-light);
  pointer-events: none;
}

.hero-rule {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-medium);
  color: var(--text-tertiary);
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.18em;
}

.hero-content {
  position: relative;
  z-index: 1;
  padding: 30px 0 18px;
}

.archive-kicker,
.section-kicker {
  margin: 0 0 10px;
  color: var(--accent-editorial);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.18em;
}

.hero-title,
.results-title,
.section-heading h2 {
  font-family: var(--font-display);
  font-weight: 600;
  letter-spacing: -0.035em;
}

.hero-title {
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(44px, 7vw, 76px);
  line-height: 1;
}

.hero-description {
  margin: 14px auto 0;
  color: var(--text-secondary);
  font-size: 15px;
  line-height: 1.7;
}

.editorial-hero :deep(.search) {
  position: relative;
  z-index: 2;
  max-width: 760px;
  margin: 0 auto;
}

.hero-shortcuts {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
  gap: 8px 22px;
  flex-wrap: wrap;
  margin-top: 17px;
}

.hero-shortcuts button {
  min-height: 30px;
  padding: 4px 0;
  color: var(--text-secondary);
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--border-medium);
  font-size: 12px;
  font-weight: 650;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}

.hero-shortcuts button:hover {
  color: var(--primary);
  border-color: var(--primary);
}

.results-search {
  display: grid;
  grid-template-columns: minmax(180px, 0.35fr) minmax(0, 1fr);
  gap: 28px;
  align-items: end;
  padding: 22px 26px;
  background: var(--bg-paper);
  border-top: 3px solid var(--text-primary);
  border-bottom: 1px solid var(--border-medium);
}

.results-title {
  margin: 0;
  font-size: 30px;
  line-height: 1;
}

.discovery-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 28px;
  align-items: start;
}

.douban-hot-section,
.trending-section {
  min-width: 0;
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-medium);
}

.section-heading h2 {
  margin: 0;
  font-size: 28px;
  line-height: 1.05;
}

.section-heading > span {
  color: var(--text-tertiary);
  font-size: 11px;
}

.section-heading--compact {
  align-items: start;
}

.trending-section {
  position: sticky;
  top: 84px;
  padding: 18px;
  background: var(--bg-paper);
  border: 1px solid var(--border-medium);
  box-shadow: var(--shadow-sm);
}

/* 统计和过滤器栏 */
.stats-bar {
  background: var(--bg-paper);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  padding: 16px;
  box-shadow: var(--shadow-sm);
  animation: fadeIn 0.4s ease;
}

.stats-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-main {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-light);
}

.stat-label {
  font-size: 13px;
  color: var(--text-tertiary);
  font-weight: 500;
}

.stat-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary);
}

/* 加载指示器 */
.loading-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(15, 118, 110, 0.1);
  border-radius: var(--radius-md);
  border: 1px solid rgba(15, 118, 110, 0.2);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: var(--primary);
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

.loading-text {
  font-size: 13px;
  color: var(--primary);
  font-weight: 500;
}

/* 暂停状态指示器（统计栏） */
.paused-indicator-bar {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(245, 158, 11, 0.1);
  border-radius: var(--radius-md);
  border: 1px solid rgba(245, 158, 11, 0.3);
  color: #f59e0b;
  font-weight: 500;
}

.pause-icon {
  font-size: 14px;
}

.paused-text {
  font-size: 13px;
}

/* 平台过滤器 */
.platform-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.filter-pill {
  padding: 6px 12px;
  border: 1px solid var(--border-light);
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color var(--transition-fast), border-color var(--transition-fast),
    color var(--transition-fast), transform var(--transition-fast),
    box-shadow var(--transition-fast);
  white-space: nowrap;
}

.filter-pill:hover {
  background: var(--bg-primary);
  border-color: var(--border-medium);
  transform: translateY(-1px);
}

.filter-pill.active {
  background: var(--primary);
  color: var(--text-on-primary);
  border-color: var(--primary);
  box-shadow: 0 4px 12px var(--primary-glow);
}

/* 排序选择器 */
.sorter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-select {
  padding: 8px 12px;
  border: 1px solid var(--border-light);
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  cursor: pointer;
  transition: background-color var(--transition-fast), border-color var(--transition-fast),
    box-shadow var(--transition-fast);
  min-width: 140px;
}

.sort-select:hover {
  background: var(--bg-primary);
  border-color: var(--border-medium);
}

.sort-select:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
}

/* 搜索结果区域 */
.results-section {
  animation: fadeIn 0.5s ease;
}

.results-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

/* 空状态 */
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 48px 24px;
  animation: fadeIn 0.4s ease;
}

.empty-card {
  background: var(--bg-paper);
  border: 1px solid var(--border-medium);
  border-radius: var(--radius-sm);
  padding: 32px;
  text-align: center;
  max-width: 400px;
  box-shadow: var(--shadow-lg);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-card h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: var(--text-primary);
}

.empty-card p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.empty-suggestions {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  justify-content: center;
}
.empty-suggestions__label {
  font-size: 13px;
  color: var(--text-tertiary);
}
.empty-suggestions__tag {
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid var(--border-light);
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.empty-suggestions__tag:hover {
  border-color: var(--primary);
  color: var(--primary);
}

/* 错误提示 */
.error-alert {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  color: var(--error);
  font-weight: 500;
  animation: fadeIn 0.3s ease;
}

.error-icon {
  font-size: 18px;
}

/* 热搜推荐 */
.hot-search-section {
  animation: fadeIn 0.6s ease;
}

/* 移动端优化 */
@media (max-width: 900px) {
  .discovery-grid {
    grid-template-columns: 1fr;
  }

  .trending-section {
    position: static;
  }
}

@media (max-width: 640px) {
  .editorial-hero {
    padding: 16px 14px 24px;
  }

  .hero-rule {
    padding: 0 4px 12px;
    font-size: 8px;
  }

  .hero-content {
    padding: 24px 4px 16px;
  }

  .hero-title {
    font-size: 46px;
  }

  .hero-description {
    max-width: 290px;
    font-size: 13px;
  }

  .hero-shortcuts {
    justify-content: flex-start;
    flex-wrap: nowrap;
    gap: 16px;
    overflow-x: auto;
    padding: 0 4px 4px;
  }

  .hero-shortcuts button {
    flex: 0 0 auto;
  }

  .results-search {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 18px 14px;
  }

  .results-title {
    font-size: 26px;
  }

  .section-heading {
    align-items: start;
  }

  .section-heading h2 {
    font-size: 24px;
  }

  .section-heading > span {
    max-width: 100px;
    text-align: right;
  }

  .trending-section {
    padding: 14px;
  }

  .stats-bar {
    padding: 12px;
  }

  .stats-main {
    gap: 8px;
  }

  .stat-item {
    padding: 6px 10px;
  }

  .stat-value {
    font-size: 16px;
  }

  .platform-filters {
    gap: 6px;
  }

  .filter-pill {
    padding: 5px 10px;
    font-size: 12px;
  }

  .sort-select {
    min-width: 120px;
    font-size: 12px;
  }

  .empty-card {
    padding: 24px;
  }

  .empty-icon {
    font-size: 36px;
  }

  .empty-card h3 {
    font-size: 18px;
  }

  .suggestions-card {
    padding: 16px;
  }

  .tag {
    padding: 6px 12px;
    font-size: 12px;
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .editorial-hero,
  .trending-section {
    border-width: 2px;
  }

  .hero-shortcuts button {
    border-bottom-width: 2px;
  }

  .filter-pill.active {
    border-width: 2px;
  }

  .sort-select {
    border-width: 2px;
  }

  .tag {
    border-width: 2px;
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  .editorial-hero,
  .hero-title,
  .hero-description,
  .stats-bar,
  .results-section,
  .empty-state,
  .error-alert,
  .hot-search-section {
    animation: none;
  }

  .filter-pill:hover,
  .sort-select:hover {
    transform: none;
  }

  .pulse-dot {
    animation: none;
    opacity: 0.7;
  }
}

</style>
