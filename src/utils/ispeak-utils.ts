import type { ISpeakItem } from "../types/ispeak";

/**
 * 格式化ISpeak日期
 * @param dateString - ISO日期字符串
 * @returns 格式化的日期字符串 (YYYY-MM-DD)
 */
export function formatISpeakDate(dateString: string): string {
	const date = new Date(dateString);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

/**
 * 格式化ISpeak时间
 * @param dateString - ISO日期字符串
 * @returns 格式化的时间字符串 (HH:mm)
 */
export function formatISpeakTime(dateString: string): string {
	const date = new Date(dateString);
	const hours = String(date.getHours()).padStart(2, "0");
	const minutes = String(date.getMinutes()).padStart(2, "0");
	return `${hours}:${minutes}`;
}

/**
 * 获取权限标签文本
 * @param item - ISpeak项目
 * @returns 权限标签文本
 */
export function getPermissionLabel(item: ISpeakItem): string {
	switch (item.type) {
		case "0":
			return "公开";
		case "1":
			return "登录可见";
		case "2":
			return "仅作者可见";
		default:
			return "未知";
	}
}


