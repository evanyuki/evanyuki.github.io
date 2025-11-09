<script lang="ts">
  import type { ISpeakItem } from "../types/ispeak";
  import ISpeakCard from "./ISpeakCard.svelte";

  export let year: number;
  export let month: number;
  export let items: ISpeakItem[];
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

  <!-- Grid 卡片布局 -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each items as item}
      <ISpeakCard {item} />
    {/each}
  </div>
</div>
