import type { FriendLink } from "@/data/friend-links";

type WalineComment = {
	comment?: unknown;
	rid?: unknown;
};

type WalineCommentResponse = {
	data?: WalineComment[];
	totalPages?: number;
};

const COMMENT_PAGE_SIZE = 100;
const MAX_COMMENT_PAGES = 10;

function getField(comment: string, field: string): string | undefined {
	const line = comment
		.replace(/\r\n?/g, "\n")
		.split("\n")
		.find((value) => {
			const normalized = value
				.trim()
				.replace(/^[-*+]\s+/, "")
				.replace(/^[`*]+|[`*]+$/g, "");
			return new RegExp(`^${field}\\s*[:：]`, "i").test(normalized);
		});

	if (!line) return undefined;

	return line
		.trim()
		.replace(/^[-*+]\s+/, "")
		.replace(/^[`*]+|[`*]+$/g, "")
		.replace(new RegExp(`^${field}\\s*[:：]\\s*`, "i"), "")
		.trim()
		.replace(/^<(.+)>$/, "$1")
		.replace(/^`(.+)`$/, "$1");
}

function getHttpUrl(value: string | undefined): string | undefined {
	if (!value) return undefined;

	const match = value.match(/https?:\/\/[^\s<>)\]]+/i);
	if (!match) return undefined;

	try {
		const url = new URL(match[0]);
		return url.protocol === "http:" || url.protocol === "https:"
			? url.href
			: undefined;
	} catch {
		return undefined;
	}
}

function parseFriendLink(comment: unknown): FriendLink | undefined {
	if (typeof comment !== "string") return undefined;

	const name = getField(comment, "name");
	const desc = getField(comment, "desc");
	const link = getHttpUrl(getField(comment, "link"));
	const avatar = getHttpUrl(getField(comment, "avatar"));

	if (!name || !desc || !link || !avatar) return undefined;

	const trimmedName = name.slice(0, 80);
	const trimmedDesc = desc.slice(0, 240);
	return trimmedName && trimmedDesc
		? { name: trimmedName, desc: trimmedDesc, link, avatar }
		: undefined;
}

function normalizedLink(link: string): string {
	try {
		const url = new URL(link);
		url.hash = "";
		url.search = "";
		return url.href.replace(/\/$/, "").toLowerCase();
	} catch {
		return link.toLowerCase();
	}
}

function createAvatar(friend: FriendLink): HTMLElement {
	const image = document.createElement("img");
	image.className =
		"h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-[var(--line-divider)] transition duration-300 group-hover:scale-105";
	image.src = friend.avatar;
	image.alt = `${friend.name} 的头像`;
	image.loading = "lazy";
	image.referrerPolicy = "no-referrer";
	image.addEventListener(
		"error",
		() => {
			const fallback = document.createElement("span");
			fallback.className =
				"flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[var(--btn-regular-bg)] text-xl font-bold text-[var(--primary)]";
			fallback.textContent = friend.name.slice(0, 1).toUpperCase();
			image.replaceWith(fallback);
		},
		{ once: true },
	);
	return image;
}

function createFriendLinkCard(friend: FriendLink): HTMLAnchorElement {
	const card = document.createElement("a");
	card.className =
		"card-base group relative flex min-h-36 items-center gap-4 overflow-hidden rounded-[var(--radius-large)] p-5 transition duration-300 hover:-translate-y-1 hover:shadow-lg";
	card.href = friend.link;
	card.target = "_blank";
	card.rel = "noopener noreferrer";
	card.dataset.friendLinkSource = "comment";

	const body = document.createElement("div");
	body.className = "min-w-0 flex-1";

	const heading = document.createElement("h2");
	heading.className = "mb-1 truncate text-lg font-bold text-[var(--primary)]";
	heading.textContent = friend.name;

	const source = document.createElement("span");
	source.className =
		"mb-2 inline-block rounded-full bg-[var(--btn-regular-bg)] px-2 py-0.5 text-xs font-medium text-50";
	source.textContent = "来自评论";

	const description = document.createElement("p");
	description.className = "line-clamp-2 text-sm leading-6 text-50";
	description.textContent = friend.desc;

	const icon = document.createElement("span");
	icon.className =
		"absolute right-4 top-4 text-sm text-50 opacity-0 transition group-hover:opacity-100";
	icon.textContent = "↗";

	body.append(heading, source, description);
	card.append(createAvatar(friend), body, icon);
	return card;
}

async function loadCommentFriendLinks(
	serverURL: string,
	path: string,
): Promise<FriendLink[]> {
	const links: FriendLink[] = [];
	let totalPages = 1;

	for (
		let page = 1;
		page <= totalPages && page <= MAX_COMMENT_PAGES;
		page += 1
	) {
		const endpoint = new URL("comment", `${serverURL.replace(/\/$/, "")}/`);
		endpoint.search = new URLSearchParams({
			path,
			page: String(page),
			pageSize: String(COMMENT_PAGE_SIZE),
			sortBy: "insertedAt_desc",
		}).toString();

		const response = await fetch(endpoint);
		if (!response.ok)
			throw new Error(`Waline request failed: ${response.status}`);

		const payload = (await response.json()) as WalineCommentResponse;
		totalPages = payload.totalPages ?? 1;
		for (const comment of payload.data ?? []) {
			if (comment.rid) continue;
			const friend = parseFriendLink(comment.comment);
			if (friend) links.push(friend);
		}
	}

	return links;
}

function parseManualLinks(value: string | undefined): FriendLink[] {
	if (!value) return [];
	try {
		const parsed = JSON.parse(value) as unknown;
		return Array.isArray(parsed) ? parsed.filter(isFriendLink) : [];
	} catch {
		return [];
	}
}

function isFriendLink(value: unknown): value is FriendLink {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<FriendLink>;
	return (
		typeof candidate.name === "string" &&
		typeof candidate.link === "string" &&
		typeof candidate.desc === "string" &&
		typeof candidate.avatar === "string"
	);
}

export function initFriendLinks(): void {
	const root = document.getElementById("friend-links");
	if (!root || root.dataset.friendLinksInitialized === "true") return;

	root.dataset.friendLinksInitialized = "true";
	const grid = root.querySelector<HTMLElement>("[data-friend-links-grid]");
	const manualLinks = parseManualLinks(root.dataset.manualLinks);
	const serverURL = root.dataset.commentServer;
	const path = root.dataset.commentPath;
	if (!grid || !serverURL || !path) return;

	const manualKeys = new Set(
		manualLinks.map((friend) => normalizedLink(friend.link)),
	);
	let refreshTimer: number | undefined;

	const refresh = async () => {
		try {
			const commentLinks = await loadCommentFriendLinks(serverURL, path);
			const uniqueLinks = new Map<string, FriendLink>();
			for (const friend of commentLinks) {
				const key = normalizedLink(friend.link);
				if (!manualKeys.has(key) && !uniqueLinks.has(key))
					uniqueLinks.set(key, friend);
			}

			grid
				.querySelectorAll<HTMLElement>('[data-friend-link-source="comment"]')
				.forEach((card) => {
					card.remove();
				});
			for (const friend of uniqueLinks.values()) {
				grid.append(createFriendLinkCard(friend));
			}
		} catch (error) {
			console.error("Unable to load friend links from Waline", error);
		}
	};

	const scheduleRefresh = () => {
		window.clearTimeout(refreshTimer);
		refreshTimer = window.setTimeout(() => void refresh(), 600);
	};

	const waline = document.getElementById("waline");
	if (waline) {
		new MutationObserver(scheduleRefresh).observe(waline, {
			childList: true,
			subtree: true,
		});
	}
	window.addEventListener("friend-links:refresh", scheduleRefresh);
	void refresh();
}
