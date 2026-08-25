/** A link that is maintained directly in the repository. */
export interface FriendLink {
	name: string;
	link: string;
	desc: string;
	avatar: string;
}

/**
 * 手动维护的友链。
 *
 * 评论中的申请会自动显示在友链页；需要置顶、补录或不经过评论添加的站点，请在此处增加一项。
 */
export const manualFriendLinks: FriendLink[] = [
	{
		name: "安知鱼",
		link: "https://blog.anheyu.com",
		desc: "生活明朗，万物可爱",
		avatar: "https://npm.elemecdn.com/anzhiyu-blog-static@1.0.4/img/avatar.jpg",
	},
	{
		name: "RisingIce",
		link: "https://www.imrising.cn",
		desc: "自由摇曳 生生不息",
		avatar: "https://www.imrising.cn/images/avatar.png",
	},
	{
		name: "Kegongteng",
		link: "https://kegongteng.cn",
		desc: "Blogger / Technophile / Student",
		avatar: "https://kegongteng.cn/favicon.ico",
	},
	{
		name: "Echo",
		link: "https://www.liveout.cn",
		desc: "Life is code. I will debug it.",
		avatar: "https://liveout.cn/usr/uploads/pic/icon1.jpg",
	},
	{
		name: "朝瓜夕拾",
		link: "https://yuubari.cn",
		desc: "瓜瓜和果果的Blog",
		avatar: "https://yuubari.cn/upload/3628985i.png",
	},
	{
		name: "朽丘秋雨",
		link: "https://koxiuqiu.cn",
		desc: "一定会和喜欢的人在夏日夜晚牵手慢步",
		avatar: "https://koxiuqiu.cn/aicon.png",
	},

	{
		name: "Elykia",
		link: "https://blog.elykia.cn",
		desc: "致以无瑕之人",
		avatar: "https://bu.dusays.com/2024/10/25/671b2438203a6.gif",
	},
];
