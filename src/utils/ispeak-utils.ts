import type {
	ApiResponse,
	ISpeakItem,
	ISpeakListResponse,
	PaginationParams,
} from "../types/ispeak";
import { apiConfig } from "../config";
import { buildQueryString } from "./url-utils";
import { getToken } from "./auth-utils";

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
			const { logout } = await import("./auth-utils");
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
 * 获取ISpeak列表（使用getByPage接口）
 * 需要JWT认证，可以获取所有类型的内容（包括作者可见内容）
 */
export async function fetchISpeakList(
	params: PaginationParams = {},
): Promise<ISpeakListResponse> {
	const {
		page = 1,
		pageSize = apiConfig.defaultPageSize,
		author = apiConfig.userId,
	} = params;

	// 验证必需参数
	if (!page || !pageSize) {
		throw new Error("page和pageSize参数是必需的");
	}

	// author参数可选，如果不提供则使用当前登录用户（从JWT token中获取）
	const requestParams: Record<string, string | number> = {
		page,
		pageSize,
	};

	if (author) {
		requestParams.author = author;
	}

	// 构建完整URL
	const queryString = buildQueryString(requestParams);
	const url = `${apiConfig.baseUrl}/api/ispeak/getByPage${queryString}`;

	// 设置请求头
	const requestHeaders: HeadersInit = {
		"Content-Type": "application/json",
	};

	// 添加JWT token（支持服务端和客户端）
	const token = getToken();
	if (token) {
		requestHeaders["Authorization"] = `Bearer ${token}`;
	} else {
		// 根据环境给出不同的错误提示
		if (typeof window !== "undefined") {
			// 客户端环境：提示用户登录
			throw new Error("未登录，请先登录以获取完整数据");
		} else {
			// 服务端环境：提示配置环境变量
			throw new Error("JWT token未配置，无法访问需要认证的API");
		}
	}

	try {
		const response = await fetch(url, {
			method: "GET",
			headers: requestHeaders,
		});

		const data = await handleApiResponse<ISpeakListResponse>(
			response,
			"获取ISpeak列表",
			true,
		);

		return data.data;
	} catch (error) {
		console.error("API请求失败:", error);
		throw error;
	}
}

/**
 * 格式化日期
 */
export function formatISpeakDate(dateString: string): string {
	const date = new Date(dateString);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * 格式化时间
 */
export function formatISpeakTime(dateString: string): string {
	const date = new Date(dateString);
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	return `${hours}:${minutes}`;
}

/**
 * 获取权限类型标签
 */
export function getPermissionLabel(item: ISpeakItem): string {
	if (item.type === "0") {
		return "公开";
	}
	if (item.type === "1") {
		return "登录可见";
	}
	if (item.type === "2") {
		return "仅作者可见";
	}
	return "";
}

/**
 * 智能获取ISpeak列表
 * 根据登录状态自动选择使用公开API或认证API
 */
export async function fetchISpeakListSmart(
	params: PaginationParams = {},
): Promise<ISpeakListResponse> {
	const token = getToken();

	if (token) {
		// 有token：使用认证API
		return await fetchISpeakList(params);
	} else {
		// 无token：使用公开API
		const { fetchISpeakListClient } = await import("./ispeak-client-utils");
		return await fetchISpeakListClient(params);
	}
}

