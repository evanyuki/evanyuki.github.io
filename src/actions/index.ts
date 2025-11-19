import { defineAction } from "astro:actions";
import { getISpeakList } from "./ispeak";

// 导出所有服务器端 Actions
export const server = {
	getISpeakList,
};

