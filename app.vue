<template>
  <div class="layout">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>

    <!-- 顶部导航 - Apple 风简洁头部 -->
    <header class="header">
      <nav class="nav">
        <NuxtLink to="/" class="brand" aria-label="PanHub 首页">
          <span class="brand-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </span>
          <span class="brand-copy">
            <span class="brand-text">PANHUB</span>
            <span class="brand-edition">RESOURCE JOURNAL</span>
          </span>
        </NuxtLink>

        <div class="nav-actions">
          <!-- 暗色模式切换 -->
          <ClientOnly>
            <button class="btn-icon" type="button" @click="toggleDark" :aria-label="isDark ? '切换到亮色模式' : '切换到暗色模式'" :title="isDark ? '亮色模式' : '暗色模式'">
              <svg v-if="!isDark" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            </button>
          </ClientOnly>
          <!-- 设置按钮 -->
          <button class="btn-icon" type="button" @click="openSettings = true" aria-label="打开设置" title="设置">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </button>
        </div>
      </nav>
    </header>

    <!-- 链接检测助手安装/升级提示条（全宽细条，导航栏下方） -->
    <div v-if="showCheckerTip" class="checker-bar">
      <span class="checker-bar__text">
        <template v-if="checkerTipType === 'upgrade'">
          🔔 <a href="/panhub-link-checker.user.js" class="checker-bar__link">链接检测助手</a>
          有新版本（v{{ LATEST_CHECKER_VERSION }}），点击安装更新
          <span class="checker-bar__sep">·</span>
          <span class="checker-bar__ver">当前 v{{ installedCheckerVersion }}</span>
        </template>
        <template v-else>
          💡 安装 <a href="/panhub-link-checker.user.js" class="checker-bar__link">链接检测助手</a>
          油猴脚本，自动标记失效链接
          <span class="checker-bar__sep">·</span>
          需要 <a href="https://www.tampermonkey.net/" target="_blank" rel="noopener" class="checker-bar__link">Tampermonkey</a> 扩展
        </template>
      </span>
      <button class="checker-bar__close" @click="dismissCheckerTip" aria-label="关闭">✕</button>
    </div>

    <!-- 主内容区 -->
    <main class="main">
      <NuxtPage />

      <!-- Google AdSense 广告位（页面底部，延迟加载不影响首屏） -->
      <ClientOnly>
        <aside class="ad-slot" aria-label="赞助内容">
          <ins
            class="adsbygoogle"
            style="display:block"
            data-ad-client="ca-pub-4044602309325996"
            data-ad-slot="auto"
            data-ad-format="auto"
            data-full-width-responsive="true"></ins>
        </aside>
      </ClientOnly>
    </main>

    <!-- 设置抽屉 -->
    <ClientOnly>
      <SettingsDrawer
        v-model="settings"
        v-model:open="openSettings"
        :all-plugins="ALL_PLUGIN_NAMES"
        :all-tg-channels="allTgChannels"
        @save="saveSettings"
        @reset-default="resetToDefault" />
    </ClientOnly>

    <!-- Toast 通知 -->
    <div v-if="toast.show" class="toast" :class="toast.type" role="status" aria-live="polite">
      {{ toast.message }}
    </div>

    <!-- 密码门（仅在用户发起搜索时弹出） -->
    <ClientOnly>
      <PasswordGate
        :show="showPasswordGate"
        :error="auth.error.value || ''"
        :submitting="unlockSubmitting"
        @unlock="onUnlock" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ALL_PLUGIN_NAMES } from "./config/plugins";
import channelsConfig from "~/config/channels.json";
// 暗色模式：阻塞脚本设置 class + CSS 文件引入
// 同时注入 Google AdSense 验证与远程脚本（async 不阻塞首屏渲染）
useHead({
  meta: [
    { name: "google-adsense-account", content: "ca-pub-4044602309325996" },
  ],
  link: [{ rel: "stylesheet", href: "/css/dark-mode.css" }],
  script: [
    {
      innerHTML: `(function(){var s=localStorage.getItem('panhub:dark-mode');var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(d)document.documentElement.classList.add('dark')})();`,
    },
    {
      src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4044602309325996",
      async: true,
      crossorigin: "anonymous",
    },
  ],
});

const { settings, loadSettings, saveSettings, resetToDefault } = useSettings();
const { toast, showToast } = useToast();
const { isDark, toggle: toggleDark, init: initDarkMode } = useDarkMode();
const auth = useAuth();
const openSettings = ref(false);
const showPasswordGate = ref(false);
const unlockSubmitting = ref(false);
const pendingOnUnlock = ref<(() => void) | null>(null);

function requestUnlock(onSuccess?: () => void) {
  pendingOnUnlock.value = onSuccess ?? null;
  showPasswordGate.value = true;
}

async function onUnlock(password: string) {
  unlockSubmitting.value = true;
  const ok = await auth.unlock(password);
  unlockSubmitting.value = false;
  if (ok) {
    showPasswordGate.value = false;
    const cb = pendingOnUnlock.value;
    pendingOnUnlock.value = null;
    if (cb) {
      nextTick(() => cb());
    }
  }
}

provide("requestUnlock", requestUnlock);

// 所有可用的 TG 频道（用于设置面板）
const allTgChannels = computed(() => {
  const configChannels = (useRuntimeConfig().public as any)?.tgDefaultChannels;
  return Array.isArray(configChannels) && configChannels.length > 0
    ? configChannels
    : channelsConfig.defaultChannels;
});

// 监听设置保存事件，显示提示
watch(() => settings.value, (newVal, oldVal) => {
  if (oldVal && newVal && JSON.stringify(newVal) !== JSON.stringify(oldVal)) {
    showToast("设置已保存", "success");
  }
}, { deep: true });

// 链接检测助手安装/升级提示条
const CHECKER_TIP_KEY = "panhub:checker-tip-dismissed";
const CHECKER_VER_KEY = "panhub:checker-last-version";
const LATEST_CHECKER_VERSION = "2.0.0";
const showCheckerTip = ref(false);
const checkerTipType = ref<"install" | "upgrade">("install");
const installedCheckerVersion = ref("");

function checkCheckerTip() {
  const win = window as any;
  try {
    // 已安装且版本匹配 → 无提示，记录版本
    if (win.__panhub_linkCheckerReady && win.__panhub_linkCheckerVersion === LATEST_CHECKER_VERSION) {
      localStorage.setItem(CHECKER_VER_KEY, LATEST_CHECKER_VERSION);
      return;
    }
    // 已安装但版本过旧 → 升级提示（用户已关闭此版本则不再提示）
    if (win.__panhub_linkCheckerReady && win.__panhub_linkCheckerVersion) {
      const dismissedVer = localStorage.getItem(CHECKER_VER_KEY);
      if (dismissedVer === win.__panhub_linkCheckerVersion) return;
      installedCheckerVersion.value = win.__panhub_linkCheckerVersion;
      checkerTipType.value = "upgrade";
      showCheckerTip.value = true;
      return;
    }
    // 未安装 → 安装提示（用户之前关闭过则不显示）
    if (localStorage.getItem(CHECKER_TIP_KEY)) return;
    checkerTipType.value = "install";
    showCheckerTip.value = true;
  } catch {
    showCheckerTip.value = true;
  }
}
function dismissCheckerTip() {
  showCheckerTip.value = false;
  try {
    // 安装提示：记录关闭状态
    if (checkerTipType.value === "install") {
      localStorage.setItem(CHECKER_TIP_KEY, "1");
    }
    // 升级提示：记录已知版本（下次不再提示同一版本）
    if (checkerTipType.value === "upgrade") {
      localStorage.setItem(CHECKER_VER_KEY, installedCheckerVersion.value);
    }
  } catch {}
}

onMounted(() => {
  initDarkMode();
  loadSettings();
  auth.fetchStatus();
  // 延迟 1 秒检测（等油猴脚本注入）
  setTimeout(checkCheckerTip, 1000);
  // 初始化 AdSense 广告位（延迟推送，不阻塞首屏）
  setTimeout(() => {
    try {
      const w = window as any;
      w.adsbygoogle = w.adsbygoogle || [];
      const slots = document.querySelectorAll(".adsbygoogle");
      slots.forEach(() => w.adsbygoogle.push({}));
    } catch (e) {
      // 广告拦截或网络错误，忘记即可
    }
  }, 1500);
});

onBeforeUnmount(() => {
  // 保留钩子占位，当前无需清理监听器
});
</script>

<style>
@import '~/assets/css/global.css';
</style>

<style scoped>
/* 主布局 */
.layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
}

/* 背景装饰 - 玻璃拟态效果 */
.bg-decoration {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: -1;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.12;
  animation: blobFloat 14s ease-in-out infinite;
}

.blob-1 {
  width: 420px;
  height: 420px;
  background: #b44935;
  top: -180px;
  left: -130px;
  animation-delay: 0s;
}

.blob-2 {
  width: 360px;
  height: 360px;
  background: #b88a52;
  bottom: -180px;
  right: -120px;
  animation-delay: 3s;
}

.blob-3 {
  width: 260px;
  height: 260px;
  background: #78634c;
  top: 42%;
  left: 68%;
  animation-delay: 6s;
}

/* 顶部导航 - 编辑式刊头 */
.header {
  background: var(--bg-glass);
  backdrop-filter: saturate(120%) blur(18px);
  -webkit-backdrop-filter: saturate(120%) blur(18px);
  border-bottom: 1px solid var(--border-light);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav {
  max-width: 1180px;
  margin: 0 auto;
  padding: 13px 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

/* 品牌标识 */
.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  text-decoration: none;
  color: var(--text-primary);
  transition: opacity var(--transition-fast);
}

.brand:hover {
  opacity: 0.78;
}

.brand-icon {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--text-primary);
  border-radius: 50%;
  background: transparent;
  color: var(--text-primary);
}

.brand-copy {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.brand-text {
  color: var(--text-primary);
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1;
}

.brand-edition {
  color: var(--text-tertiary);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

/* 导航操作区 */
.nav-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 图标按钮 - iOS 风 */
.btn-icon {
  width: 38px;
  height: 38px;
  padding: 0;
  background: var(--bg-btn);
  border: 1px solid var(--border-light);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: background var(--transition-fast), color var(--transition-fast),
    transform var(--transition-fast), box-shadow var(--transition-fast);
  backdrop-filter: blur(10px);
}

.btn-icon:hover {
  background: var(--bg-btn-hover);
  color: var(--text-primary);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-icon:active {
  transform: translateY(0) scale(0.97);
}

.btn-icon svg {
  stroke: currentColor;
}

/* 主内容区 */
.main {
  flex: 1;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 34px 28px 48px;
  animation: fadeIn 0.5s ease;
}

/* AdSense 广告位 - Apple 风卡片 */
.ad-slot {
  margin: 32px auto 8px;
  padding: 12px;
  background: var(--bg-surface);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  min-height: 100px;
}

.ad-slot .adsbygoogle {
  display: block;
  width: 100%;
  min-height: 90px;
}

/* Toast 通知 */
.toast {
  position: fixed;
  top: 80px;
  right: 24px;
  padding: 12px 20px;
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--border-light);
  font-weight: 500;
  z-index: 1000;
  animation: slideInRight 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.toast::before {
  content: "";
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.toast.info {
  color: var(--primary);
  border-left: 4px solid var(--primary);
}

.toast.success {
  color: var(--success);
  border-left: 4px solid var(--success);
}

.toast.error {
  color: var(--error);
  border-left: 4px solid var(--error);
}

/* 移动端优化 */
@media (max-width: 900px) {
  .nav {
    padding: 10px 16px;
  }

  .nav-actions {
    gap: 6px;
  }

  .btn-icon {
    width: 36px;
    height: 36px;
  }

  .main {
    padding: 16px;
  }

  .brand {
    font-size: 17px;
  }

  .brand-icon {
    width: 28px;
    height: 28px;
  }

  .toast {
    right: 16px;
    left: 16px;
    top: 70px;
  }

  .blob {
    filter: blur(40px);
  }

  .ad-slot {
    margin: 24px auto 4px;
    padding: 8px;
    border-radius: var(--radius-md);
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .btn-icon {
    border-width: 2px;
  }

  .brand-text {
    -webkit-text-fill-color: var(--text-primary);
    color: var(--text-primary);
  }
}

/* 减少动画模式支持 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }

  .blob {
    animation: none;
  }
}

/* 链接检测助手通知条 */
.checker-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 6px 16px;
  background: linear-gradient(90deg, rgba(15, 118, 110, 0.1) 0%, rgba(245, 158, 11, 0.08) 100%);
  border-bottom: 1px solid rgba(15, 118, 110, 0.12);
  font-size: 13px;
  color: var(--text-secondary, #4b5563);
  line-height: 1.4;
  animation: barSlideIn 0.3s ease;
}
.checker-bar__text {
  text-align: center;
}
.checker-bar__link {
  color: var(--primary, #0f766e);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 2px;
}
.checker-bar__link:hover {
  opacity: 0.8;
}
.checker-bar__sep {
  margin: 0 4px;
  opacity: 0.4;
}
.checker-bar__ver {
  opacity: 0.6;
  font-size: 0.9em;
}
.checker-bar__close {
  flex-shrink: 0;
  background: none;
  border: none;
  font-size: 14px;
  color: var(--text-tertiary, #9ca3af);
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;
}
.checker-bar__close:hover {
  color: var(--text-primary, #1f2937);
}
@keyframes barSlideIn {
  from { opacity: 0; transform: translateY(-100%); }
  to { opacity: 1; transform: translateY(0); }
}
@media (max-width: 640px) {
  .checker-bar {
    padding: 5px 12px;
    font-size: 12px;
  }
  .checker-bar__sep {
    display: none;
  }
}
</style>
