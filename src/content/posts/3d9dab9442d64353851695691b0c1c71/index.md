---
title: Yarn building fresh packages... 解决方案
published: 2023-03-17
description: '本质上还是源的问题：需要给electron设置一个特定的源。'
image: 'https://picsum.photos/seed/3d9dab9442d64353851695691b0c1c71/1920/1080'
tags: ["yarn","换源"]
category: '技术'
draft: false
---

本质上还是源的问题：需要给electron设置一个特定的源。

项目下新增文件：
**.yarnrc**

输入以下源：

```bash
registry "https://registry.npmmirror.com"
sass_binary_site "https://npmmirror.com/mirrors/node-sass/"
phantomjs_cdnurl "http://cnpmjs.org/downloads"
electron_mirror "https://npmmirror.com/mirrors/electron/"
sqlite3_binary_host_mirror "https://foxgis.oss-cn-shanghai.aliyuncs.com/"
profiler_binary_host_mirror "https://npmmirror.com/mirrors/node-inspector/"
chromedriver_cdnurl "https://npmmirror.com/mirrors/chromedriver/"
```