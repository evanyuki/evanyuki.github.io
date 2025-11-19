<script lang="ts">
  import { onMount } from "svelte";
  import type { ISpeakItem, ISpeakListResponse } from "../types/ispeak";
  import ISpeakGroup from "./ISpeakGroup.svelte";
  import {
    logout,
    getToken,
    getUserInfo as getUserInfoFromUtils,
  } from "../utils/auth-utils";
  import { actions } from "astro:actions";
  import { loginModal } from "../stores/loginModal";
  import {
    tokenStore,
    userInfoStore,
    getUserInfo,
    setToken,
    setUserInfo,
  } from "../stores/auth";

  export let initialData: ISpeakListResponse;

  interface Group {
    year: number;
    month: number;
    items: ISpeakItem[];
  }

  let groups: Group[] = [];
  let currentPage = 1;
  let totalItems = initialData.total || 0;
  const pageSize = 20;
  let isLoading = false;
  let error: string | null = null;

  // 使用响应式 Store 管理登录状态
  $: loggedIn = $tokenStore !== null;
  $: userInfo = $userInfoStore;

  /**
   * 获取当前用户ID的辅助函数
   * 直接从 store 获取，确保获取最新值
   */
  function getCurrentUserId(): string {
    return getUserInfo()?.userId || "";
  }

  /**
   * 按年月分组函数（优化版）
   * 减少重复的 Date 对象创建，提升性能
   */
  function groupItems(items: ISpeakItem[]): Group[] {
    if (items.length === 0) return [];

    const grouped = new Map<string, Group>();

    // 一次性处理所有 items，减少重复操作
    for (const item of items) {
      const date = new Date(item.createdAt);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${month}`;

      let group = grouped.get(key);
      if (!group) {
        group = { year, month, items: [] };
        grouped.set(key, group);
      }
      group.items.push(item);
    }

    // 转换为数组并排序（按年月降序）
    const groupArray = Array.from(grouped.values()).sort((a, b) => {
      if (a.year !== b.year) {
        return b.year - a.year;
      }
      return b.month - a.month;
    });

    // 每个组内的 items 按时间倒序排序
    // 直接比较字符串格式的 ISO 日期，避免创建 Date 对象
    for (const group of groupArray) {
      group.items.sort((a, b) => {
        // ISO 8601 格式的字符串可以直接进行字典序比较
        return b.createdAt.localeCompare(a.createdAt);
      });
    }

    return groupArray;
  }

  /**
   * 合并新数据到现有分组（优化版）
   * 使用更高效的去重和合并策略
   */
  function mergeGroups(
    existingGroups: Group[],
    newItems: ISpeakItem[]
  ): Group[] {
    if (newItems.length === 0) return existingGroups;

    // 创建现有 items 的 ID 集合，用于快速去重
    const existingIds = new Set<string>();
    for (const group of existingGroups) {
      for (const item of group.items) {
        existingIds.add(item._id);
      }
    }

    // 过滤掉已存在的 items
    const uniqueNewItems = newItems.filter(
      (item) => !existingIds.has(item._id)
    );

    if (uniqueNewItems.length === 0) return existingGroups;

    // 收集所有 items（使用 flatMap 更简洁）
    const allItems: ISpeakItem[] = [
      ...existingGroups.flatMap((group) => group.items),
      ...uniqueNewItems,
    ];

    // 重新分组
    return groupItems(allItems);
  }

  /**
   * 统一的数据获取函数
   * 提取公共逻辑，减少代码重复
   */
  async function fetchData(page: number, shouldMerge: boolean = false) {
    if (isLoading) return;

    isLoading = true;
    error = null;

    try {
      const userId = getCurrentUserId();
      // 从 store 获取 token 并传递给 action
      const token = $tokenStore;
      const result = await actions.getISpeakList({
        author: userId || undefined,
        page,
        pageSize,
        token: token || null,
      });

      if (result.error) {
        throw new Error(result.error.message || "加载失败");
      }

      const newData = result.data;
      if (!newData?.items || newData.items.length === 0) {
        return;
      }

      if (shouldMerge) {
        // 合并模式：用于加载更多
        groups = mergeGroups(groups, newData.items);
        currentPage = page;
      } else {
        // 替换模式：用于重新加载
        groups = groupItems(newData.items);
        currentPage = 1;
      }

      // 更新总数（优先使用新数据中的总数）
      if (newData.total !== undefined) {
        totalItems = newData.total;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "加载失败";
      error = errorMessage;
      console.error("加载数据失败:", err);
    } finally {
      isLoading = false;
    }
  }

  onMount(() => {
    // 初始化分组
    groups = groupItems(initialData.items);
    totalItems = initialData.total || initialData.items.length;

    // 从 Cookie 恢复 token 和用户信息（用于页面刷新后恢复登录状态）
    const token = getToken();
    const userInfo = getUserInfoFromUtils();
    if (token) {
      setToken(token);
    }
    if (userInfo) {
      setUserInfo(userInfo);
    }
  });

  /**
   * 处理登录成功
   * 登录状态会自动通过 Store 更新，这里只需要重新加载数据
   */
  async function handleLoginSuccess() {
    await reloadData();
  }

  /**
   * 打开登录弹窗
   */
  function openLoginModal() {
    loginModal.open(handleLoginSuccess);
  }

  /**
   * 处理登出
   * 登出后 Store 会自动更新，这里只需要重新加载数据
   */
  async function handleLogout() {
    logout();
    await reloadData();
  }

  /**
   * 重新加载数据（重置到第一页）
   */
  async function reloadData() {
    await fetchData(1, false);
  }

  /**
   * 加载更多数据（追加到当前列表）
   */
  async function loadMore() {
    await fetchData(currentPage + 1, true);
  }

  // 计算是否还有更多数据（优化：使用缓存或更高效的计算）
  $: totalLoadedItems = groups.reduce(
    (sum, group) => sum + group.items.length,
    0
  );
  $: hasMore = totalLoadedItems < totalItems;
  $: isEmpty = groups.length === 0;
</script>

<div class="ispeak-panel-container">
  <!-- 登录/登出按钮 -->
  <div class="auth-controls">
    {#if loggedIn}
      <div class="user-info">
        <span class="user-name">欢迎，{userInfo?.userName || "用户"}</span>
        <button class="logout-button" on:click={handleLogout} type="button">
          登出
        </button>
      </div>
    {:else}
      <button class="login-button" on:click={openLoginModal} type="button">
        登录
      </button>
    {/if}
  </div>

  {#if isEmpty}
    <div class="empty-state">
      <p class="empty-icon">📝</p>
      <p class="empty-text">暂无动态</p>
    </div>
  {:else}
    <div class="ispeak-panel">
      {#each groups as group}
        <ISpeakGroup
          year={group.year}
          month={group.month}
          items={group.items}
        />
      {/each}

      <!-- 加载更多按钮 -->
      {#if hasMore}
        <div class="load-more-container">
          {#if error}
            <div class="error-message">
              <p class="error-text">{error}</p>
              <button
                class="retry-button"
                on:click={loadMore}
                disabled={isLoading}
              >
                重试
              </button>
            </div>
          {:else}
            <button
              class="load-more-button"
              on:click={loadMore}
              disabled={isLoading}
            >
              {#if isLoading}
                <span class="loading-spinner"></span>
                <span>加载中...</span>
              {:else}
                加载更多
              {/if}
            </button>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .ispeak-panel-container {
    width: 100%;
    padding: 1.5rem 2rem;
  }

  .auth-controls {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 1.5rem;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .user-name {
    font-size: 0.875rem;
    color: var(--text-75, #333);
  }

  .login-button,
  .logout-button {
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid var(--border-color, #e5e7eb);
  }

  .login-button {
    background-color: var(--primary, #6366f1);
    color: white;
    border-color: var(--primary, #6366f1);
  }

  .login-button:hover {
    background-color: var(--primary-hover, #4f46e5);
    border-color: var(--primary-hover, #4f46e5);
  }

  .logout-button {
    background-color: var(--card-bg, #fff);
    color: var(--text-75, #333);
  }

  .logout-button:hover {
    background-color: var(--bg-secondary, #f3f4f6);
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--text-muted, var(--text-50));
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .empty-text {
    font-size: 1.125rem;
  }

  .ispeak-panel {
    width: 100%;
  }

  .load-more-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem 0;
  }

  .load-more-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 2rem;
    background-color: var(--card-bg, #fff);
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 0.5rem;
    color: var(--text-75, #333);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .load-more-button:hover:not(:disabled) {
    background-color: var(--primary, #6366f1);
    color: white;
    border-color: var(--primary, #6366f1);
  }

  .load-more-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .loading-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid var(--text-50, #999);
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .error-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .error-text {
    color: var(--error-color, #ef4444);
    font-size: 0.875rem;
  }

  .retry-button {
    padding: 0.5rem 1.5rem;
    background-color: var(--error-color, #ef4444);
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: opacity 0.2s ease;
  }

  .retry-button:hover:not(:disabled) {
    opacity: 0.9;
  }

  .retry-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
