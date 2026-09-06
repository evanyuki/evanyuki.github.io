import assert from "node:assert/strict";
import {
	QR,
	QR_MARGIN,
	QR_PATHS,
	QR_TARGET,
	canopyHeight,
	qrCellColor,
} from "../src/data/cherry-qr.ts";

// Run: node tests/cherry-qr.test.mjs
assert.equal(QR_TARGET, "https://evanyuki.github.io/");
assert.equal(QR.length, 29);
assert.equal(QR_MARGIN, 4);
const cells = new Map();
for (const { d, fill } of QR_PATHS) {
	for (const [, x, y] of d.matchAll(/M(\d+),(\d+)h1v1h-1z/g)) {
		const col = Number(x) - QR_MARGIN;
		const row = Number(y) - QR_MARGIN;
		assert.ok(col >= 0 && col < QR.length && row >= 0 && row < QR.length);
		assert.ok(!cells.has(`${col},${row}`), "SVG modules must not overlap");
		cells.set(`${col},${row}`, fill);
	}
}
for (let row = 0; row < QR.length; row++) {
	assert.match(QR[row], /^[01]{29}$/);
	for (let col = 0; col < QR.length; col++) {
		assert.equal(
			cells.has(`${col},${row}`),
			QR[row][col] === "1",
			"scan view must match the scene, without mirroring or extra modules",
		);
		if (QR[row][col] === "1")
			assert.equal(cells.get(`${col},${row}`), qrCellColor(col, row));
		const height = canopyHeight(col, row);
		assert.ok(Number.isInteger(height) && height >= 0 && height <= 33);
	}
}
assert.equal(canopyHeight(0, 0), 0);
assert.ok(canopyHeight(14, 14) > canopyHeight(14, 24));
console.log(
	`Cherry QR: ${cells.size} colored modules match the tree; four-module margins and canopy bounds verified.`,
);
