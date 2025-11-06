---
title: npm 国内镜像换源
published: 2022-09-13
description: 'http://npm.taobao.org/'
image: 'https://picsum.photos/seed/ebc9beb92ab143099b3726faad0da960/1920/1080'
tags: ["npm","换源"]
category: '技术'
draft: false
---

## 淘宝npm地址：

    http://npm.taobao.org/

临时生效：

    npm install 软件名 --registry https://registry.npm.taobao.org

**永久生效**

    npm config set registry https://registry.npm.taobao.org

验证：

    npm config get registry
    # OR
    npm info express

## Pip 清华源

    pip3 config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

## cnpm（不推荐）：

    npm install -g --registry=https://registry.npm.taobao.org

    # 使用

    cnpm install install express

[npm更换国内源--解决npm install慢的问题](https://blog.csdn.net/weixin_43619065/article/details/98207250)