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

function applicationText(value: FormDataEntryValue | null, maxLength: number): string {
	return typeof value === "string"
		? value.replace(/\s+/g, " ").trim().slice(0, maxLength)
		: "";
}

export function initFriendLinkApplication(): void {
	const root = document.getElementById("friend-links");
	const form = root?.querySelector<HTMLFormElement>(
		"[data-friend-link-application-form]",
	);
	const dialog = root?.querySelector<HTMLDialogElement>(
		"[data-friend-link-application-dialog]",
	);
	if (!root || !form || !dialog || form.dataset.initialized === "true") return;

	form.dataset.initialized = "true";
	const typeInput = form.querySelector<HTMLInputElement>(
		"[data-friend-link-application-type]",
	);
	const typeButtons = form.querySelectorAll<HTMLButtonElement>(
		"[data-friend-link-application-kind]",
	);
	const submitButton = form.querySelector<HTMLButtonElement>(
		"[data-friend-link-application-submit]",
	);
	const status = form.querySelector<HTMLElement>(
		"[data-friend-link-application-status]",
	);
	const serverURL = root.dataset.commentServer;
	const path = root.dataset.commentPath;
	if (!typeInput || !submitButton || !status || !serverURL || !path) return;

	root
		.querySelectorAll<HTMLButtonElement>("[data-friend-link-application-open]")
		.forEach((button) => button.addEventListener("click", () => dialog.showModal()));
	root
		.querySelector<HTMLButtonElement>("[data-friend-link-application-close]")
		?.addEventListener("click", () => dialog.close());
	dialog.addEventListener("click", (event) => {
		if (event.target === dialog) dialog.close();
	});

	const setApplicationType = (type: "new" | "update") => {
		typeInput.value = type;
		for (const button of typeButtons) {
			const active = button.dataset.friendLinkApplicationKind === type;
			button.ariaPressed = String(active);
			button.classList.toggle("bg-[var(--primary)]", active);
			button.classList.toggle("text-white", active);
			button.classList.toggle("border-[var(--primary)]", active);
			button.classList.toggle("text-50", !active);
			button.classList.toggle("border-[var(--line-divider)]", !active);
		}
	};

	for (const button of typeButtons) {
		button.addEventListener("click", () => {
			setApplicationType(
				button.dataset.friendLinkApplicationKind === "update" ? "update" : "new",
			);
		});
	}

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		if (!form.reportValidity()) return;

		const fields = new FormData(form);
		const name = applicationText(fields.get("name"), 80);
		const desc = applicationText(fields.get("description"), 240);
		const mail = applicationText(fields.get("email"), 254);
		const link = getHttpUrl(applicationText(fields.get("link"), 2048));
		const avatar = getHttpUrl(applicationText(fields.get("avatar"), 2048));
		const screenshot = getHttpUrl(applicationText(fields.get("screenshot"), 2048));
		const rss = getHttpUrl(applicationText(fields.get("rss"), 2048));

		if (!name || !desc || !mail || !link || !avatar) {
			status.textContent = "请填写完整的名称、链接、Logo、简介与邮箱。";
			return;
		}

		const applicationType = typeInput.value === "update" ? "update" : "new";
		const comment = [
			"<!-- friend-link-application -->",
			`application: ${applicationType}`,
			`name: ${name}`,
			`link: ${link}`,
			`desc: ${desc}`,
			`avatar: ${avatar}`,
			screenshot ? `screenshot: ${screenshot}` : "",
			rss ? `rss: ${rss}` : "",
		]
			.filter(Boolean)
			.join("\n");

		submitButton.disabled = true;
		status.textContent = "正在提交申请…";

		try {
			const endpoint = new URL(
				"api/comment?lang=zh-CN",
				`${serverURL.replace(/\/$/, "")}/`,
			);
			const response = await fetch(endpoint, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					nick: name,
					mail,
					link,
					comment,
					ua: navigator.userAgent,
					url: path,
				}),
			});
			const payload = (await response.json().catch(() => null)) as
				| { errno?: number; errmsg?: string }
				| null;
			if (!response.ok || payload?.errno)
				throw new Error(payload?.errmsg || "提交失败");

			form.reset();
			setApplicationType("new");
			status.textContent = "申请已提交，会自动展示在友链列表中。";
			window.dispatchEvent(new Event("friend-links:refresh"));
		} catch (error) {
			status.textContent =
				error instanceof Error ? `提交失败：${error.message}` : "提交失败，请稍后重试。";
		} finally {
			submitButton.disabled = false;
		}
	});
}
