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
 * Cookie 名称常量
 */
const TOKEN_COOKIE_NAME = "auth_token";
const USER_INFO_COOKIE_NAME = "user_info";

/**
 * 保存token到内存（通过 Store）和 Cookie
 * 客户端：保存到 Store 和 Cookie
 * 服务器端：仅保存到 Cookie（通过 Astro.cookies）
 */
export function saveToken(loginData: LoginResponse, cookies?: any): void {
	if (isClient()) {
		// 客户端：保存到 Store（内存存储）
		setToken(loginData.token);
		setUserInfo({
			userId: loginData.userId,
			userName: loginData.userName,
		});

		// 同时保存到 Cookie（用于服务器端访问）
		try {
			document.cookie = `${TOKEN_COOKIE_NAME}=${encodeURIComponent(loginData.token)}; path=/; max-age=${60 * 60 * 24 * 1}; SameSite=Lax`; // 1天过期
			document.cookie = `${USER_INFO_COOKIE_NAME}=${encodeURIComponent(JSON.stringify({ userId: loginData.userId, userName: loginData.userName }))}; path=/; max-age=${60 * 60 * 24 * 1}; SameSite=Lax`;
		} catch (error) {
			console.error("保存token到Cookie失败:", error);
		}
	} else if (cookies) {
		// 服务器端：保存到 Cookie（通过 Astro.cookies）
		try {
			cookies.set(TOKEN_COOKIE_NAME, loginData.token, {
				path: "/",
				maxAge: 60 * 60 * 24 * 1, // 1天过期
				sameSite: "lax",
				httpOnly: false, // 需要客户端也能访问
			});
			cookies.set(USER_INFO_COOKIE_NAME, JSON.stringify({
				userId: loginData.userId,
				userName: loginData.userName,
			}), {
				path: "/",
				maxAge: 60 * 60 * 24 * 1,
				sameSite: "lax",
				httpOnly: false,
			});
		} catch (error) {
			console.error("保存token到Cookie失败:", error);
		}
	}
}

/**
 * 从 Cookie 或 Header 获取 JWT token（服务器端）
 * @param cookies - Astro.cookies 对象（服务器端）
 * @param request - Request 对象（可选，用于从 Header 读取）
 * @returns JWT token 或 null
 */
export function getTokenFromRequest(
	cookies?: any,
	request?: Request,
): string | null {
	if (isClient()) {
		// 客户端：优先从内存 Store 获取，如果没有则从 Cookie 读取
		const storeToken = getTokenFromStore();
		if (storeToken) return storeToken;

		// 从 Cookie 读取（用于页面刷新后恢复）
		try {
			const cookieValue = document.cookie
				.split("; ")
				.find((row) => row.startsWith(`${TOKEN_COOKIE_NAME}=`))
				?.split("=")[1];
			if (cookieValue) {
				const token = decodeURIComponent(cookieValue);
				// 同步到 Store
				setToken(token);
				return token;
			}
		} catch (error) {
			console.error("从Cookie读取token失败:", error);
		}
		return null;
	}

	// 服务器端：从 Cookie 或 Header 读取
	if (cookies) {
		// 优先从 Cookie 读取
		const cookieToken = cookies.get(TOKEN_COOKIE_NAME)?.value;
		if (cookieToken) {
			return cookieToken;
		}
	}

	// 如果没有 Cookie，尝试从 Authorization Header 读取
	if (request) {
		const authHeader = request.headers.get("Authorization");
		if (authHeader && authHeader.startsWith("Bearer ")) {
			return authHeader.substring(7);
		}
	}

	return null;
}

/**
 * 从内存获取JWT token（通过 Store）
 * 客户端：从内存 Store 或 Cookie 获取
 * 服务器端：需要传入 cookies 和 request 参数
 * @param cookies - Astro.cookies 对象（服务器端可选）
 * @param request - Request 对象（服务器端可选）
 */
export function getToken(cookies?: any, request?: Request): string | null {
	if (isServer()) {
		// 服务器端：从 Cookie 或 Header 读取
		return getTokenFromRequest(cookies, request);
	}

	// 客户端：优先从内存 Store 获取，如果没有则从 Cookie 读取
	return getTokenFromRequest();
}

/**
 * 从 Cookie 获取用户信息（服务器端）
 * @param cookies - Astro.cookies 对象（服务器端）
 * @returns 用户信息或 null
 */
export function getUserInfoFromRequest(cookies?: any): UserInfo | null {
	if (isClient()) {
		// 客户端：优先从内存 Store 获取，如果没有则从 Cookie 读取
		const storeUserInfo = getUserInfoFromStore();
		if (storeUserInfo) return storeUserInfo;

		// 从 Cookie 读取（用于页面刷新后恢复）
		try {
			const cookieValue = document.cookie
				.split("; ")
				.find((row) => row.startsWith(`${USER_INFO_COOKIE_NAME}=`))
				?.split("=")[1];
			if (cookieValue) {
				const userInfo = JSON.parse(decodeURIComponent(cookieValue));
				// 同步到 Store
				setUserInfo(userInfo);
				return userInfo;
			}
		} catch (error) {
			console.error("从Cookie读取用户信息失败:", error);
		}
		return null;
	}

	// 服务器端：从 Cookie 读取
	if (cookies) {
		const cookieValue = cookies.get(USER_INFO_COOKIE_NAME)?.value;
		if (cookieValue) {
			try {
				return JSON.parse(cookieValue);
			} catch (error) {
				console.error("解析用户信息Cookie失败:", error);
			}
		}
	}

	return null;
}

/**
 * 从内存获取用户信息（通过 Store）
 * 客户端：从内存 Store 或 Cookie 获取
 * 服务器端：需要传入 cookies 参数
 * @param cookies - Astro.cookies 对象（服务器端可选）
 */
export function getUserInfo(cookies?: any): UserInfo | null {
	if (isClient()) {
		return getUserInfoFromRequest();
	}
	return getUserInfoFromRequest(cookies);
}

/**
 * 检查是否已登录
 */
export function isLoggedIn(): boolean {
	return isLoggedInFromStore();
}

/**
 * 清除token和用户信息（从内存和 Cookie 中清除）
 * @param cookies - Astro.cookies 对象（服务器端可选）
 */
export function logout(cookies?: any): void {
	if (isClient()) {
		// 客户端：清除内存和 Cookie
		clearAuth();
		try {
			// 清除 Cookie（设置过期时间为过去）
			document.cookie = `${TOKEN_COOKIE_NAME}=; path=/; max-age=0`;
			document.cookie = `${USER_INFO_COOKIE_NAME}=; path=/; max-age=0`;
		} catch (error) {
			console.error("清除Cookie失败:", error);
		}
	} else if (cookies) {
		// 服务器端：清除 Cookie
		try {
			cookies.delete(TOKEN_COOKIE_NAME);
			cookies.delete(USER_INFO_COOKIE_NAME);
		} catch (error) {
			console.error("清除Cookie失败:", error);
		}
	}
}

