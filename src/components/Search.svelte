<script lang="ts">
  import I18nKey from "@i18n/i18nKey";
  import { i18n } from "@i18n/translation";
  import Icon from "@iconify/svelte";
  import { onMount } from "svelte";
  import type { SearchResult } from "@/global";
  import { url } from "@/utils/url-utils";

  let keywordDesktop = "";
  let keywordMobile = "";
  let result: SearchResult[] = [];
  let isSearching = false;

  // 防抖定时器
  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  const SEARCH_DEBOUNCE_DELAY = 300; // 300ms 防抖延迟

  const togglePanel = () => {
    const panel = document.getElementById("search-panel");
    panel?.classList.toggle("float-panel-closed");
  };

  const setPanelVisibility = (show: boolean, isDesktop: boolean): void => {
    const panel = document.getElementById("search-panel");
    if (!panel || !isDesktop) return;

    if (show) {
      panel.classList.remove("float-panel-closed");
    } else {
      panel.classList.add("float-panel-closed");
    }
  };

  // Pagefind 结果类型定义
  interface PagefindResult {
    url?: string;
    meta?: { title?: string };
    excerpt?: string;
    data?: () => Promise<PagefindResult>;
  }

  // 将 Pagefind 结果转换为 SearchResult 格式
  const convertPagefindResult = (
    pagefindResult: PagefindResult
  ): SearchResult | null => {
    try {
      // Pagefind 返回的数据结构
      const resultUrl = pagefindResult.url || "";
      const title = pagefindResult.meta?.title || "";

      // 提取摘要，Pagefind 已经包含高亮标记
      const excerpt = pagefindResult.excerpt || "";

      // 如果 Pagefind 没有提供标题，尝试从 URL 推断
      let finalTitle = title;
      if (!finalTitle && resultUrl) {
        const urlParts = resultUrl.split("/").filter(Boolean);
        finalTitle = urlParts[urlParts.length - 1] || "Untitled";
        // 移除文件扩展名
        finalTitle = finalTitle.replace(/\.(html|htm)$/i, "");
        // URL 解码
        try {
          finalTitle = decodeURIComponent(finalTitle);
        } catch {
          // 忽略解码错误
        }
      }

      return {
        url: resultUrl || url("/"),
        meta: {
          title: finalTitle || "Untitled",
        },
        excerpt: excerpt || "",
      };
    } catch (error) {
      console.error("Error converting pagefind result:", error);
      return null;
    }
  };

  const performSearch = async (
    keyword: string,
    isDesktop: boolean
  ): Promise<void> => {
    if (!keyword.trim()) {
      setPanelVisibility(false, isDesktop);
      result = [];
      return;
    }

    if (!window.pagefind) {
      return;
    }

    isSearching = true;

    try {
      const searchResponse = await window.pagefind.search(keyword);

      if (searchResponse?.results) {
        // 获取前 10 个结果
        const results = searchResponse.results.slice(0, 10);

        // 获取每个结果的详细信息
        const detailedResults = await Promise.all(
          results.map(async (resultItem: PagefindResult) => {
            try {
              // 如果 resultItem 有 data 方法，调用它获取详细信息
              const data =
                typeof resultItem.data === "function"
                  ? await resultItem.data()
                  : resultItem;
              return convertPagefindResult(data);
            } catch (error) {
              console.error("Error fetching result data:", error);
              // 如果获取详细数据失败，使用基本信息
              return convertPagefindResult(resultItem);
            }
          })
        );

        result = detailedResults.filter((r): r is SearchResult => r !== null);
      } else {
        result = [];
      }

      setPanelVisibility(result.length > 0, isDesktop);
    } catch (error) {
      console.error("Search error:", error);
      result = [];
      setPanelVisibility(false, isDesktop);
    } finally {
      isSearching = false;
    }
  };

  // 带防抖的搜索函数
  const search = (keyword: string, isDesktop: boolean): void => {
    // 清除之前的定时器
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }

    // 如果关键词为空，立即执行（不需要防抖）
    if (!keyword.trim()) {
      performSearch(keyword, isDesktop);
      return;
    }

    // 设置新的防抖定时器
    searchDebounceTimer = setTimeout(() => {
      performSearch(keyword, isDesktop);
    }, SEARCH_DEBOUNCE_DELAY);
  };

  onMount(() => {
    let handlePagefindReady: (() => void) | null = null;

    // 监听 pagefind 初始化完成事件
    handlePagefindReady = () => {
      // 初始化后执行搜索
      if (window.pagefind) {
        if (keywordDesktop) search(keywordDesktop, true);
        if (keywordMobile) search(keywordMobile, false);
      }
    };

    // 如果 pagefind 已经初始化，立即执行搜索
    if (window.pagefind) {
      handlePagefindReady();
    } else {
      // 否则监听初始化完成事件（使用 once: true，不需要手动清理）
      window.addEventListener("pagefind:ready", handlePagefindReady, {
        once: true,
      });
    }

    // 清理函数：组件卸载时清除防抖定时器
    return () => {
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = null;
      }
    };
  });

  // 响应式搜索：桌面端
  $: if (keywordDesktop !== undefined) {
    if (window.pagefind) {
      search(keywordDesktop, true);
    }
  }

  // 响应式搜索：移动端
  $: if (keywordMobile !== undefined) {
    if (window.pagefind) {
      search(keywordMobile, false);
    }
  }
</script>

<!-- search bar for desktop view -->
<div
  id="search-bar"
  class="hidden lg:flex transition-all items-center h-11 mr-2 rounded-lg
      bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
"
>
  <Icon
    icon="material-symbols:search"
    class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"
  ></Icon>
  <input
    placeholder={i18n(I18nKey.search)}
    bind:value={keywordDesktop}
    on:focus={() => search(keywordDesktop, true)}
    class="transition-all pl-10 text-sm bg-transparent outline-0
         h-full w-40 active:w-60 focus:w-60 text-black/50 dark:text-white/50"
  />
</div>

<!-- toggle btn for phone/tablet view -->
<button
  on:click={togglePanel}
  aria-label="Search Panel"
  id="search-switch"
  class="btn-plain scale-animation lg:!hidden rounded-lg w-11 h-11 active:scale-90"
>
  <Icon icon="material-symbols:search" class="text-[1.25rem]"></Icon>
</button>

<!-- search panel -->
<div
  id="search-panel"
  class="float-panel float-panel-closed search-panel absolute md:w-[30rem]
top-20 left-4 md:left-[unset] right-4 shadow-2xl rounded-2xl p-2"
>
  <!-- search bar inside panel for phone/tablet -->
  <div
    id="search-bar-inside"
    class="flex relative lg:hidden transition-all items-center h-11 rounded-xl
      bg-black/[0.04] hover:bg-black/[0.06] focus-within:bg-black/[0.06]
      dark:bg-white/5 dark:hover:bg-white/10 dark:focus-within:bg-white/10
  "
  >
    <Icon
      icon="material-symbols:search"
      class="absolute text-[1.25rem] pointer-events-none ml-3 transition my-auto text-black/30 dark:text-white/30"
    ></Icon>
    <input
      placeholder="Search"
      bind:value={keywordMobile}
      class="pl-10 absolute inset-0 text-sm bg-transparent outline-0
               focus:w-60 text-black/50 dark:text-white/50"
    />
  </div>

  <!-- search results -->
  {#each result as item}
    <a
      href={item.url}
      class="transition first-of-type:mt-2 lg:first-of-type:mt-0 group block
       rounded-xl text-lg px-3 py-2 hover:bg-[var(--btn-plain-bg-hover)] active:bg-[var(--btn-plain-bg-active)]"
    >
      <div
        class="transition text-90 inline-flex font-bold group-hover:text-[var(--primary)]"
      >
        {item.meta.title}<Icon
          icon="fa6-solid:chevron-right"
          class="transition text-[0.75rem] translate-x-1 my-auto text-[var(--primary)]"
        ></Icon>
      </div>
      <div class="transition text-sm text-50 line-clamp-3">
        {@html item.excerpt}
      </div>
    </a>
  {/each}
</div>

<style>
  input:focus {
    outline: 0;
  }
  .search-panel {
    max-height: calc(100vh - 100px);
    overflow-y: auto;
  }
</style>
