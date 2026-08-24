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
		name: "RisingIce",
		link: "https://www.imrising.cn",
		desc: "自由摇曳 生生不息",
		avatar: "https://www.imrising.cn/images/avatar.png",
	},
	{
		name: "Elykia",
		link: "https://blog.elykia.cn",
		desc: "致以无瑕之人",
		avatar: "https://bu.dusays.com/2024/10/25/671b2438203a6.gif",
	},
];
