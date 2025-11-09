<script lang="ts">
  import { onMount } from "svelte";
  import type { ISpeakItem, ISpeakListResponse } from "../types/ispeak";
  import ISpeakGroup from "./ISpeakGroup.svelte";
  import { isLoggedIn, getUserInfo, logout } from "../utils/auth-utils";
  import { fetchISpeakListSmart } from "@utils/ispeak-utils";
  import { loginModal } from "../stores/loginModal";
  import type { UserInfo } from "@/types/auth";

  export let initialData: ISpeakListResponse;
  export let currentUserId: string = "";

  interface Group {
    year: number;
    month: number;
    items: ISpeakItem[];
  }

  let groups: Group[] = [];
  let currentPage = 1;
  let totalItems = initialData.total || 0;
  let pageSize = 20;
  let isLoading = false;
  let error: string | null = null;

  // 登录状态
  let loggedIn = false;
  let userInfo: UserInfo | null = null;

  // 按年月分组函数
  function groupItems(items: ISpeakItem[]): Group[] {
    const grouped = items.reduce(
      (acc, item) => {
        const date = new Date(item.createdAt);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        const key = `${year}-${month}`;
        if (!acc[key]) {
          acc[key] = {
            year,
            month,
            items: [],
          };
        }
        acc[key].items.push(item);
        return acc;
      },
      {} as Record<string, Group>
    );

    // 转换为数组并排序
    const groupArray = Object.values(grouped).sort((a, b) => {
      if (a.year !== b.year) {
        return b.year - a.year;
      }
      return b.month - a.month;
    });

    // 每个组内的items按时间倒序排序
    groupArray.forEach((group) => {
      group.items.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

    return groupArray;
  }

  // 合并新数据到现有分组
  function mergeGroups(
    existingGroups: Group[],
    newItems: ISpeakItem[]
  ): Group[] {
    // 创建现有items的ID集合，用于去重
    const existingIds = new Set<string>();
    existingGroups.forEach((group) => {
      group.items.forEach((item) => {
        existingIds.add(item._id);
      });
    });

    // 过滤掉已存在的items
    const uniqueNewItems = newItems.filter(
      (item) => !existingIds.has(item._id)
    );

    // 合并所有items
    const allItems: ISpeakItem[] = [];
    existingGroups.forEach((group) => {
      allItems.push(...group.items);
    });
    allItems.push(...uniqueNewItems);

    // 重新分组
    return groupItems(allItems);
  }

  onMount(() => {
    // 检查登录状态
    loggedIn = isLoggedIn();
    if (loggedIn) {
      userInfo = getUserInfo();
      if (userInfo) {
        currentUserId = userInfo.userId;
      }
    }

    // 初始化分组
    groups = groupItems(initialData.items);
    totalItems = initialData.total || initialData.items.length;
  });

  // 处理登录成功
  async function handleLoginSuccess() {
    loggedIn = true;
    userInfo = getUserInfo();
    if (userInfo) {
      currentUserId = userInfo.userId;
    }

    // 重新加载数据（使用认证API）
    await reloadData();
  }

  // 打开登录弹窗
  function openLoginModal() {
    loginModal.open(handleLoginSuccess);
  }

  // 处理登出
  async function handleLogout() {
    logout();
    loggedIn = false;
    userInfo = null;
    currentUserId = "";

    // 重新加载数据（使用公开API）
    await reloadData();
  }

  // 重新加载数据
  async function reloadData() {
    isLoading = true;
    error = null;

    try {
      const newData = await fetchISpeakListSmart({
        author: currentUserId || undefined,
        page: 1,
        pageSize: pageSize,
      });

      if (newData.items && newData.items.length > 0) {
        groups = groupItems(newData.items);
        totalItems = newData.total || totalItems;
        currentPage = 1;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "加载失败";
      console.error("加载数据失败:", err);
    } finally {
      isLoading = false;
    }
  }

  // 加载更多数据
  async function loadMore() {
    if (isLoading) return;

    isLoading = true;
    error = null;

    try {
      const nextPage = currentPage + 1;
      const newData = await fetchISpeakListSmart({
        author: currentUserId || undefined,
        page: nextPage,
        pageSize: pageSize,
      });

      if (newData.items && newData.items.length > 0) {
        // 合并新数据到现有分组
        groups = mergeGroups(groups, newData.items);
        currentPage = nextPage;
        totalItems = newData.total || totalItems;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "加载失败";
      console.error("加载更多数据失败:", err);
    } finally {
      isLoading = false;
    }
  }

  // 计算是否还有更多数据
  $: hasMore =
    groups.reduce((sum, group) => sum + group.items.length, 0) < totalItems;
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
