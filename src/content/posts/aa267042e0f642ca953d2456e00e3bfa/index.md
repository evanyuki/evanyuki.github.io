---
title: Google & DeepL API
published: 2023-04-18
description: ''
image: 'https://picsum.photos/seed/aa267042e0f642ca953d2456e00e3bfa/1920/1080'
tags: ["deepl","google","api"]
category: '技术'
draft: false
---

## Google

### free

```ts
const apiRoot = 'https://translate.googleapis.com'
const url = `${apiRoot}/translate_a/single?client=gtx&sl=${from}&tl=${to}&hl=zh-CN&dt=t&dt=bd&ie=UTF-8&oe=UTF-8&dj=1&source=icon&q=${encodeURI(text)}`

const { data } = await axios({ method: 'GET', url })
```

### Api

```ts
const apiRoot = 'https://translation.googleapis.com'
let {
      from = 'auto',
      to = 'auto',
    }

const slugs = {
      from: from === 'auto' || !from ? '' : `&source=${from}`,
      to: to === 'auto' || !to ? '' : `&target=${to}`,
    }

const url = `${this.apiRoot}/language/translate/v2?key=${key}&q=${encodeURI(text)}${slugs.from}${slugs.to}&alt=json&format=text`

const { data } = await axios({ method: 'GET', url })
```

![23958a7fe8c20681518711ad10960934.png](./d71af56fad2c4b8fa460e5b114836eeb.png)

## DeepL

```ts
const url = https://api-free.deepl.com/v2/translate
const headers = {
	Content-Type: 'application/x-www-form-urlencoded',
	Authorization: `DeepL-Auth-Key ${key}`
}
const body = {
	text: '你好',
	source_lang: 'ZH',
	target_lang: 'EN'
}
const { data } = await axios({ method: 'POST', url, headers, body })
```

PS: Content-Type: application/json 也支持

![1d18360c871a0070d20c9b952796adc8.png](./d4c57d5095794cdabca6eacc5b111b79.png)