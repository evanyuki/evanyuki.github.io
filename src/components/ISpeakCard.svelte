<script lang="ts">
  import type { ISpeakItem, ISpeakTag } from "../types/ispeak";
  import {
    formatISpeakDate,
    formatISpeakTime,
    getPermissionLabel,
  } from "../utils/ispeak-utils";

  export let item: ISpeakItem;
</script>

<div
  class="card-base p-4 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] flex flex-col h-full"
>
  <!-- 日期时间 -->
  <div class="flex items-center justify-between mb-3 text-xs text-50">
    <span>{formatISpeakDate(item.createdAt)}</span>
    <span>{formatISpeakTime(item.createdAt)}</span>
  </div>

  <!-- 图片 -->
  {#if item.images && item.images.length > 0}
    <div
      class="grid gap-2 mb-3 ispeak-images"
      class:grid-cols-1={item.images.length === 1}
      class:grid-cols-2={item.images.length === 2}
      class:grid-cols-3={item.images.length >= 3}
    >
      {#each item.images.slice(0, 3) as image, index}
        <div
          class="relative aspect-square overflow-hidden rounded-lg bg-[var(--card-bg)]"
        >
          <img
            src={image}
            alt={`${item.title || "图片"} ${index + 1}`}
            loading="lazy"
            class="w-full h-full object-cover cursor-zoom-in hover:opacity-90 transition-opacity"
          />
          {#if index === 2 && item.images.length > 3}
            <div
              class="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-lg"
            >
              +{item.images.length - 3}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  <!-- 标题 -->
  {#if item.title}
    <h3
      class="font-bold text-base mb-2 text-75 hover:text-[var(--primary)] transition-colors line-clamp-2"
    >
      {item.title}
    </h3>
  {/if}

  <!-- 内容 -->
  <div
    class="text-sm text-75 mb-3 whitespace-pre-wrap break-words line-clamp-4 flex-grow"
  >
    {item.content}
  </div>

  <!-- 标签和权限 -->
  <div class="flex flex-wrap items-center gap-2 mt-auto">
    <!-- 标签 -->
    {#if item.tag}
      <span
        class="px-2 py-1 rounded text-xs font-medium"
        style="background-color: {item.tag?.bgColor}20; color: {item.tag
          ?.bgColor || '#666'}"
      >
        {item.tag?.name}
      </span>
    {/if}

    <!-- 权限标签 -->
    {#if item.type !== "0"}
      <span
        class="px-2 py-1 rounded text-xs font-medium bg-[var(--primary)]/20 text-[var(--primary)]"
      >
        {getPermissionLabel(item)}
      </span>
    {/if}
  </div>
</div>

<style>
  .ispeak-images img {
    cursor: pointer;
  }

  /* 确保图片在PhotoSwipe中可点击 */
  :global(.ispeak-images img) {
    cursor: zoom-in;
  }
</style>
