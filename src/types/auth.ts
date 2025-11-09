// 登录请求参数
export interface LoginRequest {
	username: string;
	password: string;
}

// 登录响应数据
export interface LoginResponse {
	token: string;
	userId: string;
	userName: string;
}

// 用户信息
export interface UserInfo {
	userId: string;
	userName: string;
}

