// API响应类型
export interface ApiResponse<T> {
	data: T;
	message: string;
	type: "success" | "error";
	code: number;
}

// ISpeak作者信息
export interface ISpeakAuthor {
	_id: string;
	nickName: string;
	avatar: string;
}

// ISpeak标签信息
export interface ISpeakTag {
	_id: string;
	name: string;
	bgColor?: string;
}

// ISpeak内容类型
export type ISpeakType = "0" | "1" | "2"; // 0-公开, 1-登录可见, 2-仅作者可见

// ISpeak单项数据
export interface ISpeakItem {
	_id: string;
	title?: string;
	content: string;
	type: ISpeakType;
	author: ISpeakAuthor | string; // 可能是对象或ID字符串
	tag: ISpeakTag;
	images?: string[];
	showComment?: boolean;
	createdAt: string;
	updatedAt?: string;
}

// ISpeak列表响应
export interface ISpeakListResponse {
	total: number;
	items: ISpeakItem[];
	// 公开API返回isLogin字段，getByPage接口不返回此字段
	isLogin?: string | null; // 用户ID或null，表示是否已登录
}

// 分页参数
export interface PaginationParams {
	page?: number;
	pageSize?: number;
	author?: string;
}




