import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import type {
	ApiResponse,
	ISpeakListResponse,
} from "../types/ispeak";
import { apiConfig } from "../config";
import { buildQueryString } from "../utils/url-utils";
import { getToken } from "../utils/auth-utils";

/**
 * 处理API响应的公共函数
 * @param response - Fetch API响应对象
 * @param errorContext - 错误上下文信息，用于日志记录
 * @param handle401 - 是否处理401错误（默认true），如果为true且是客户端环境，会自动清除token
 * @returns 解析后的API响应数据
 */
export async function handleApiResponse<T>(
	response: Response,
	errorContext: string = "API请求",
	handle401: boolean = true,
): Promise<ApiResponse<T>> {
	// 处理401未授权错误
	if (handle401 && response.status === 401) {
		// 客户端环境：清除无效token
		if (typeof window !== "undefined") {
			const { logout } = await import("../utils/auth-utils");
			logout();
		}
		console.error(`[${errorContext}] 认证失败，请重新登录`);
		throw new Error("认证失败，请重新登录");
	}

	// 检查HTTP状态码
	if (!response.ok) {
		console.error(`[${errorContext}] HTTP错误: status ${response.status}`);
		throw new Error(`HTTP error! status: ${response.status}`);
	}

	// 解析JSON响应
	const data: ApiResponse<T> = await response.json();

	// 检查API响应码
	if (data.code !== 0) {
		console.error(`[${errorContext}] API请求失败:`, data.message || "未知错误");
		throw new Error(data.message || "API请求失败");
	}

	return data;
}

/**
 * 获取ISpeak列表的核心逻辑
 * 可以在服务器端直接调用，也可以被 action 使用
 * 支持登录后使用JWT认证，可以获取所有类型的内容（包括作者可见内容）
 * 如果未登录，则使用公开API
 */
export async function fetchISpeakListData(params: {
	author?: string;
	page?: number;
	pageSize?: number;
	token?: string | null;
}): Promise<ISpeakListResponse> {
	const finalAuthor = params.author || apiConfig.userId;
	const finalPage = params.page || 1;
	const finalPageSize = params.pageSize || apiConfig.defaultPageSize;

	// 验证必需参数
	if (!finalAuthor) {
		throw new Error("author参数是必需的");
	}

	// 检查是否有JWT token
	// 优先使用传入的 token，否则尝试从 store 获取（仅客户端）
	// 注意：在服务器端直接调用时，getToken() 需要传入 cookies 和 request
	// 但在 fetchISpeakListData 中，我们只处理传入的 token，服务器端调用应该通过 Action
	const token = params.token ?? (typeof window !== "undefined" ? getToken() : null);
	const useAuth = !!token;

	// 构建请求参数
	const requestParams: Record<string, string | number> = {
		page: finalPage,
		pageSize: finalPageSize,
	};

	// 根据是否使用认证API决定参数和端点
	let url: string;
	if (useAuth) {
		// 使用认证API：author参数可选（如果不提供则从JWT token中获取）
		if (finalAuthor) {
			requestParams.author = finalAuthor;
		}
		const queryString = buildQueryString(requestParams);
		url = `${apiConfig.baseUrl}/api/ispeak/getByPage${queryString}`;
	} else {
		// 使用公开API：author参数必需
		requestParams.author = finalAuthor;
		const queryString = buildQueryString(requestParams);
		url = `${apiConfig.baseUrl}/api/ispeak${queryString}`;
	}

	// 设置请求头
	const requestHeaders: HeadersInit = {
		"Content-Type": "application/json",
	};

	// 如果有token，添加Authorization头
	if (token) {
		requestHeaders["Authorization"] = `Bearer ${token}`;
	}

	try {
		const response = await fetch(url, {
			method: "GET",
			headers: requestHeaders,
		});

		const data = await handleApiResponse<ISpeakListResponse>(
			response,
			"获取ISpeak列表",
			useAuth, // 认证API需要处理401，公开API不需要
		);

		return data.data;
	} catch (error) {
		console.error("API请求失败:", error);
		throw error;
	}
}

/**
 * 获取ISpeak列表的Action
 * 支持登录后使用JWT认证，可以获取所有类型的内容（包括作者可见内容）
 * 如果未登录，则使用公开API
 */
export const getISpeakList = defineAction({
	input: z.object({
		author: z.string().optional(),
		page: z.number().optional().default(1),
		pageSize: z.number().optional().default(20),
	}),
	handler: async ({ author, page, pageSize }, context) => {
		const token = getToken(context.cookies, context.request);
		return await fetchISpeakListData({ author, page, pageSize, token });
	},
});

