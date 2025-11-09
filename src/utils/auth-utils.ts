import type { ApiResponse } from "../types/ispeak";
import type {
	LoginRequest,
	LoginResponse,
	UserInfo,
} from "../types/auth";
import { apiConfig } from "../config";

// localStorage键名常量
const TOKEN_STORAGE_KEY = "kkapi_jwt_token";
const USER_INFO_STORAGE_KEY = "kkapi_user_info";

/**
 * 检测是否在浏览器环境
 */
function isClient(): boolean {
	return typeof window !== "undefined" && typeof localStorage !== "undefined";
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

		// 保存token和用户信息到localStorage
		saveToken(data.data);

		return data.data;
	} catch (error) {
		console.error("登录失败:", error);
		throw error;
	}
}

/**
 * 保存token到localStorage
 */
export function saveToken(loginData: LoginResponse): void {
	if (!isClient()) return;

	try {
		localStorage.setItem(TOKEN_STORAGE_KEY, loginData.token);
		localStorage.setItem(
			USER_INFO_STORAGE_KEY,
			JSON.stringify({
				userId: loginData.userId,
				userName: loginData.userName,
			}),
		);
	} catch (error) {
		console.error("保存token失败:", error);
		throw new Error("无法保存登录信息，请检查浏览器设置");
	}
}

/**
 * 从localStorage获取JWT token
 */
export function getToken(): string | null {
	if (isServer()) {
		// 服务端：不支持token（所有认证API调用应在客户端进行）
		return null;
	}

	// 客户端：从localStorage获取
	try {
		return localStorage.getItem(TOKEN_STORAGE_KEY);
	} catch (error) {
		console.warn("无法访问localStorage:", error);
		return null;
	}
}

/**
 * 从localStorage获取用户信息
 */
export function getUserInfo(): UserInfo | null {
	if (!isClient()) return null;

	try {
		const userInfoStr = localStorage.getItem(USER_INFO_STORAGE_KEY);
		if (!userInfoStr) return null;

		return JSON.parse(userInfoStr) as UserInfo;
	} catch (error) {
		console.error("获取用户信息失败:", error);
		return null;
	}
}

/**
 * 检查是否已登录
 */
export function isLoggedIn(): boolean {
	return getToken() !== null;
}

/**
 * 清除token和用户信息
 */
export function logout(): void {
	if (!isClient()) return;

	try {
		localStorage.removeItem(TOKEN_STORAGE_KEY);
		localStorage.removeItem(USER_INFO_STORAGE_KEY);
	} catch (error) {
		console.error("清除token失败:", error);
	}
}

/**
 * 验证token有效性（通过调用需要认证的API）
 * 可选功能，用于检查token是否过期
 */
export async function validateToken(): Promise<boolean> {
	const token = getToken();
	if (!token) return false;

	try {
		const url = `${apiConfig.baseUrl}/api/user/id`;
		const response = await fetch(url, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
		});

		return response.ok;
	} catch (error) {
		console.error("验证token失败:", error);
		return false;
	}
}

