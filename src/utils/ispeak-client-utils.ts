import type {
	ISpeakListResponse,
	PaginationParams,
} from "../types/ispeak";
import { apiConfig } from "../config";
import { buildQueryString } from "./url-utils";
import { handleApiResponse } from "./ispeak-utils";

/**
 * 客户端获取ISpeak列表（使用公开API）
 * 无需JWT认证，但会根据内容类型返回不同的显示
 */
export async function fetchISpeakListClient(
	params: PaginationParams = {},
): Promise<ISpeakListResponse> {
	const {
		page = 1,
		pageSize = apiConfig.defaultPageSize,
		author = apiConfig.userId,
	} = params;

	// 验证必需参数
	if (!author) {
		throw new Error("author参数是必需的");
	}

	// 构建请求参数
	const requestParams: Record<string, string | number> = {
		author,
		page,
		pageSize,
	};

	// 构建完整URL - 使用公开API端点
	const queryString = buildQueryString(requestParams);
	const url = `${apiConfig.baseUrl}/api/ispeak${queryString}`;

	try {
		const response = await fetch(url, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
			},
		});

		const data = await handleApiResponse<ISpeakListResponse>(
			response,
			"客户端获取ISpeak列表",
			false, // 公开API不需要处理401
		);

		return data.data;
	} catch (error) {
		console.error("客户端API请求失败:", error);
		throw error;
	}
}

