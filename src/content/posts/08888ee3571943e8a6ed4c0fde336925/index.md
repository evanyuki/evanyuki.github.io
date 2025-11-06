---
title: 尝试md中使用Vue语法
published: 2022-09-16
description: '*你好， {{ msg }}*'
image: 'https://picsum.photos/seed/08888ee3571943e8a6ed4c0fde336925/1920/1080'
tags: ["vue"]
category: '前端'
draft: false
---

*你好， {{ msg }}*

<RedDiv>

*当前计数为： {{ count }}*

</RedDiv>
<button @click="count++">点我！</button>

<script setup>
import { h, ref } from 'vue'

const RedDiv = (_, ctx) => h(
  'div',
  {
    class: 'red-div',
  },
  ctx.slots.default()
)
const msg = 'Markdown 中的 Vue'
const count = ref(0)
</script>

<style>
.red-div {
  color: red;
  font-size: 18px;
}

button {
  padding: 10px 20px;
  color: #FFF;
  cursor: pointer;
  display:flex;
  justify-content: center;
  align-items: center;
  background-color: lightseagreen;
  border-radius: 0.35rem;
}
</style>