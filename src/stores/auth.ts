import { writable, get } from "svelte/store";
import type { UserInfo } from "../types/auth";

/**
 * Token Store（内存存储）
 * 使用 Svelte Store 管理 JWT Token，存储在内存中，页面刷新后丢失
 */
export const tokenStore = writable<string | null>(null);

/**
 * 用户信息 Store（内存存储）
 * 存储当前登录用户的基本信息
 */
export const userInfoStore = writable<UserInfo | null>(null);

/**
 * 辅助函数：获取当前 token
 * @returns 当前 token 或 null
 */
export function getToken(): string | null {
	return get(tokenStore);
}

/**
 * 辅助函数：获取当前用户信息
 * @returns 当前用户信息或 null
 */
export function getUserInfo(): UserInfo | null {
	return get(userInfoStore);
}

/**
 * 辅助函数：检查是否已登录
 * @returns 是否已登录
 */
export function isLoggedIn(): boolean {
	return getToken() !== null;
}

/**
 * 设置 token
 * @param token JWT token
 */
export function setToken(token: string): void {
	tokenStore.set(token);
}

/**
 * 设置用户信息
 * @param userInfo 用户信息
 */
export function setUserInfo(userInfo: UserInfo): void {
	userInfoStore.set(userInfo);
}

/**
 * 清除认证信息
 * 同时清除 token 和用户信息
 */
export function clearAuth(): void {
	tokenStore.set(null);
	userInfoStore.set(null);
}

