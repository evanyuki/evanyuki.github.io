import type { ApiResponse } from "../types/ispeak";
import type {
	LoginRequest,
	LoginResponse,
	UserInfo,
} from "../types/auth";
import { apiConfig } from "../config";
import {
	tokenStore,
	userInfoStore,
	setToken,
	setUserInfo,
	clearAuth,
	getToken as getTokenFromStore,
	getUserInfo as getUserInfoFromStore,
	isLoggedIn as isLoggedInFromStore,
} from "../stores/auth";

/**
 * 检测是否在浏览器环境
 */
function isClient(): boolean {
	return typeof window !== "undefined";
}

/**
 * 检测是否在服务端环境
 */
function isServer(): boolean {
	return typeof window === "undefined";
}

/**
 * 用户登录
 * @param credentials 登录凭据
 * @returns 登录响应数据
 */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
	if (isServer()) {
		throw new Error("登录功能仅在客户端可用");
	}

	const url = `${apiConfig.baseUrl}/api/user/login`;

	try {
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(credentials),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data: ApiResponse<LoginResponse> = await response.json();

		// 检查API响应码
		if (data.code !== 0) {
			throw new Error(data.message || "登录失败");
		}

		// 保存token和用户信息到内存（通过 Store）
		saveToken(data.data);

		return data.data;
	} catch (error) {
		console.error("登录失败:", error);
		throw error;
	}
}

/**
 * 保存token到内存（通过 Store）
 * 使用 Svelte Store 管理，存储在内存中，页面刷新后丢失
 */
export function saveToken(loginData: LoginResponse): void {
	if (!isClient()) return;

	try {
		// 保存到 Store（内存存储）
		setToken(loginData.token);
		setUserInfo({
			userId: loginData.userId,
			userName: loginData.userName,
		});
	} catch (error) {
		console.error("保存token失败:", error);
		throw new Error("无法保存登录信息");
	}
}

/**
 * 从内存获取JWT token（通过 Store）
 * 服务端始终返回 null，客户端从内存 Store 获取
 */
export function getToken(): string | null {
	if (isServer()) {
		// 服务端：不支持token（所有认证API调用应在客户端进行）
		return null;
	}

	// 客户端：从内存 Store 获取
	return getTokenFromStore();
}

/**
 * 从内存获取用户信息（通过 Store）
 */
export function getUserInfo(): UserInfo | null {
	if (!isClient()) return null;
	return getUserInfoFromStore();
}

/**
 * 检查是否已登录
 */
export function isLoggedIn(): boolean {
	return isLoggedInFromStore();
}

/**
 * 清除token和用户信息（从内存中清除）
 */
export function logout(): void {
	if (!isClient()) return;
	clearAuth();
}

