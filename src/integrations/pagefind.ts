import type { AstroIntegration } from "astro";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

export default function pagefindIntegration(): AstroIntegration {
	return {
		name: "pagefind-integration",
		hooks: {
			"astro:build:done": async ({ dir }) => {
				// 获取输出目录
				// 对于 Vercel 适配器，dir.pathname 可能是 .vercel/output/static
				// 对于其他适配器，可能是 dist
				const outputDir = dir.pathname;
				console.log(`[pagefind] Building search index for: ${outputDir}`);

				try {
					// 检查输出目录是否存在
					if (!existsSync(outputDir)) {
						console.warn(`[pagefind] Output directory does not exist: ${outputDir}`);
						return;
					}

					// 运行 pagefind
					// 使用绝对路径确保正确执行
					const absolutePath = outputDir.startsWith("/")
						? outputDir
						: join(process.cwd(), outputDir);
					
					execSync(`pagefind --site "${absolutePath}"`, {
						stdio: "inherit",
						encoding: "utf-8",
						cwd: process.cwd(),
					});
					console.log(`[pagefind] Search index built successfully`);
				} catch (error) {
					console.error(`[pagefind] Failed to build search index:`, error);
					// 不抛出错误，允许构建继续
				}
			},
		},
	};
}

