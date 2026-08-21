import type { APIRoute } from "astro";

const siteUrl = import.meta.env.SITE ?? "https://evanyuki.github.io";

const llmsTxt = `# Evanyuki

> Evanyuki 的个人博客，主要以中文分享软件开发、开发者工具、区块链与产品思考。

## 主要页面

- [首页](${new URL("/", siteUrl).toString()}): 最新文章与站点概览。
- [文章归档](${new URL("/archive/", siteUrl).toString()}): 按分类与标签浏览全部文章。
- [关于作者](${new URL("/about/", siteUrl).toString()}): 作者介绍与公开社交链接。
- [RSS](${new URL("/rss.xml", siteUrl).toString()}): 文章更新订阅。
- [XML Sitemap](${new URL("/sitemap-index.xml", siteUrl).toString()}): 可抓取页面清单。

## 内容主题

- 软件开发与编程实践
- 开发者工具、终端与环境配置
- 区块链与智能合约
- 产品、定价与个人思考

## 使用说明

文章以各自页面的正文、发布日期、更新日期和来源链接为准。引用时请链接到对应文章的规范 URL。`;

export const GET: APIRoute = () =>
	new Response(llmsTxt, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
