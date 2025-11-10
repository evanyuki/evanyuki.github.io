<script lang="ts">
  import { onMount, onDestroy, afterUpdate } from "svelte";
  import type { ISpeakItem } from "../types/ispeak";
  import ISpeakCard from "./ISpeakCard.svelte";
  import Masonry from "masonry-layout";

  export let year: number;
  export let month: number;
  export let items: ISpeakItem[];

  let masonryContainer: HTMLDivElement | null = null;
  let masonry: Masonry | null = null;
  let currentColumnCount = 1;
  let resizeObserver: ResizeObserver | null = null;
  let isLayouting = false; // 防止重复布局
  let previousItemsLength = 0; // 追踪 items 变化

  // 保存事件监听器引用用于清理
  const layoutCompleteHandler = () => {
    isLayouting = false;
  };

  // 根据容器宽度计算列数（优化：使用实际容器宽度而非窗口宽度）
  function getColumnCount(): number {
    if (!masonryContainer) return 1;
    const width = masonryContainer.offsetWidth;
    if (width >= 1024) return 3;
    if (width >= 768) return 2;
    return 1;
  }

  // 节流函数：限制函数执行频率
  function throttle(func: Function, wait: number) {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let previous = 0;

    return function (this: any, ...args: any[]) {
      const now = Date.now();
      const remaining = wait - (now - previous);

      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        func.apply(this, args);
      } else if (!timeout) {
        timeout = setTimeout(() => {
          previous = Date.now();
          timeout = null;
          func.apply(this, args);
        }, remaining);
      }
    };
  }

  // 改进的图片加载检测（支持所有图片类型）
  function waitForImages(): Promise<void> {
    if (!masonryContainer) return Promise.resolve();

    const images = Array.from(masonryContainer.querySelectorAll("img"));

    if (images.length === 0) {
      return Promise.resolve();
    }

    const promises = images.map((img) => {
      return new Promise<void>((resolve) => {
        if (img.complete && img.naturalHeight !== 0) {
          // 图片已加载且有效
          resolve();
        } else {
          // 等待图片加载
          const onLoad = () => {
            cleanup();
            resolve();
          };
          const onError = () => {
            cleanup();
            console.warn("图片加载失败:", img.src);
            resolve(); // 即使失败也继续布局
          };
          const cleanup = () => {
            img.removeEventListener("load", onLoad);
            img.removeEventListener("error", onError);
          };

          img.addEventListener("load", onLoad, { once: true });
          img.addEventListener("error", onError, { once: true });

          // 设置超时防止永久等待
          setTimeout(() => {
            cleanup();
            resolve();
          }, 5000);
        }
      });
    });

    return Promise.all(promises).then(() => {});
  }

  // 执行布局（带错误处理和状态管理）
  async function performLayout() {
    if (!masonry || isLayouting) return;

    try {
      isLayouting = true;
      await waitForImages();

      if (masonry) {
        masonry.reloadItems();
        masonry.layout();
      }
    } catch (error) {
      console.error("Masonry 布局错误:", error);
    } finally {
      isLayouting = false;
    }
  }

  // 初始化或重新布局 Masonry（优化版）
  async function initMasonry() {
    if (!masonryContainer) return;

    try {
      const newColumnCount = getColumnCount();

      // 如果列数发生变化，需要重新初始化
      if (masonry && currentColumnCount !== newColumnCount) {
        masonry.destroy();
        masonry = null;
      }

      currentColumnCount = newColumnCount;

      // 如果 Masonry 实例不存在，创建新的
      if (!masonry) {
        masonry = new Masonry(masonryContainer, {
          itemSelector: ".masonry-item",
          columnWidth: ".masonry-sizer",
          percentPosition: true,
          gutter: 16, // 1rem = 16px
          fitWidth: false,
          // 添加过渡动画配置
          transitionDuration: "0.3s",
          stagger: 30, // 交错动画
          resize: true,
          initLayout: true,
        });

        // 监听 Masonry 布局完成事件
        masonry.on("layoutComplete", layoutCompleteHandler);
      }

      // 等待图片加载后布局
      await performLayout();
    } catch (error) {
      console.error("Masonry 初始化错误:", error);
    }
  }

  // 使用 ResizeObserver 监听容器尺寸变化（优化版）
  function setupResizeObserver() {
    if (!masonryContainer || typeof ResizeObserver === "undefined") {
      // 降级方案：使用传统 resize 事件
      window.addEventListener("resize", throttledHandleResize);
      return;
    }

    resizeObserver = new ResizeObserver(
      throttle((entries: ResizeObserverEntry[]) => {
        for (const entry of entries) {
          const newColumnCount = getColumnCount();
          if (newColumnCount !== currentColumnCount) {
            initMasonry();
          } else if (masonry) {
            // 仅列宽变化时，只需重新布局
            masonry.layout();
          }
        }
      }, 150)
    );

    resizeObserver.observe(masonryContainer);
  }

  // 降级方案的 resize 处理器
  const throttledHandleResize = throttle(() => {
    const newColumnCount = getColumnCount();
    if (newColumnCount !== currentColumnCount) {
      initMasonry();
    } else if (masonry) {
      masonry.layout();
    }
  }, 150);

  onMount(() => {
    // 使用 requestAnimationFrame 延迟初始化，确保 DOM 完全准备
    requestAnimationFrame(() => {
      initMasonry();
      setupResizeObserver();
    });

    previousItemsLength = items.length;
  });

  afterUpdate(() => {
    // 优化：仅在 items 数量变化时触发重新布局
    if (items.length !== previousItemsLength && masonryContainer && masonry) {
      previousItemsLength = items.length;

      // 使用 requestAnimationFrame 确保 DOM 已更新
      requestAnimationFrame(() => {
        if (masonry && !isLayouting) {
          performLayout();
        }
      });
    }
  });

  onDestroy(() => {
    // 完整的清理逻辑
    if (masonry) {
      masonry.off("layoutComplete", layoutCompleteHandler);
      masonry.destroy();
      masonry = null;
    }

    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    } else {
      window.removeEventListener("resize", throttledHandleResize);
    }

    isLayouting = false;
  });
</script>

<div class="mb-8">
  <!-- 分组标题 -->
  <div class="flex items-center gap-3 mb-6">
    <h2 class="text-2xl font-bold text-75">
      {year} 年 {month} 月
    </h2>
    <span class="text-sm text-50 px-3 py-1 rounded-full bg-[var(--primary)]/10">
      {items.length} 条
    </span>
  </div>

  <!-- Masonry 瀑布流布局 -->
  <div bind:this={masonryContainer} class="masonry-container">
    <!-- Masonry 尺寸计算器（隐藏） -->
    <div class="masonry-sizer"></div>
    {#each items as item}
      <div class="masonry-item">
        <ISpeakCard {item} />
      </div>
    {/each}
  </div>
</div>

<style>
  .masonry-container {
    position: relative;
  }

  .masonry-sizer {
    width: 100%;
    visibility: hidden;
    height: 0;
    margin: 0;
    padding: 0;
  }

  @media (min-width: 768px) {
    .masonry-sizer {
      width: calc(50% - 8px);
    }
  }

  @media (min-width: 1024px) {
    .masonry-sizer {
      width: calc(33.333% - 11px);
    }
  }

  .masonry-item {
    width: 100%;
    margin-bottom: 1rem;
    /* 添加过渡效果以配合 Masonry 动画 */
    transition: opacity 0.3s ease;
  }

  @media (min-width: 768px) {
    .masonry-item {
      width: calc(50% - 8px);
    }
  }

  @media (min-width: 1024px) {
    .masonry-item {
      width: calc(33.333% - 11px);
    }
  }
</style>
