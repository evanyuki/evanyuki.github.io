import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../src/pages/links.astro", import.meta.url), "utf8");
const script = await readFile(
	new URL("../src/scripts/friend-links.ts", import.meta.url),
	"utf8",
);

for (const field of [
	'name="name"',
	'name="link"',
	'name="avatar"',
	'name="description"',
	'name="screenshot"',
	'name="email"',
	'name="rss"',
]) {
	assert.ok(page.includes(field), `missing application field: ${field}`);
}

assert.ok(page.includes('data-friend-link-application-kind="update"'));
assert.ok(page.includes("data-friend-link-application-dialog"));
assert.ok(page.includes('id="friend-link-comment"'));
assert.ok(page.includes('<div id="waline"></div>'));
assert.ok(script.includes('"api/comment?lang=zh-CN"'));
assert.ok(script.includes('"申请已提交，审核通过后会展示在友链列表中。"'));
