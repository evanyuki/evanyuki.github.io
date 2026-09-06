// Fixed symbol for the blog URL; the scene and scan view share these modules.
export const QR_TARGET = "https://evanyuki.github.io/";
export const QR_MARGIN = 4;
export const QR_BACKGROUND = "#f6f1e7";
export const QR = [
	"11111110010100011011101111111",
	"10000010011100000110101000001",
	"10111010111010101010101011101",
	"10111010111100001110101011101",
	"10111010101111110111101011101",
	"10000010110101111100001000001",
	"11111110101010101010101111111",
	"00000000101111010010000000000",
	"10111110011100110101001111100",
	"10011100001100011111101110001",
	"01110011101110000010011000000",
	"01100101111000101000100101010",
	"11000010001110001100100001100",
	"00110100110001110111101110001",
	"01000011001101111100100111100",
	"10000001110001010000000010010",
	"10101111010000110111000001100",
	"10000101101110011111111110101",
	"10111011011110000100111000100",
	"10110100000100101001101110010",
	"10110011001010001010111110111",
	"00000000111011110110100011111",
	"11111110010001111101101011100",
	"10000010110111010111100010001",
	"10111010100000110000111110111",
	"10111010101011011010100101100",
	"10111010100101100011111111110",
	"10000010010010001000111111010",
	"11111110100010101010000110100",
] as const;

export function qrCellColor(col: number, row: number): string {
	if (QR[row]?.[col] !== "1") return QR_BACKGROUND;
	const outer = Math.hypot(col - 14, row - 14) >= QR.length * 0.46;
	const colors = outer
		? ["#397c36", "#527f36", "#647536"]
		: ["#a95173", "#b45d7d", "#bb6b87", "#9f4b6e"];
	return colors[(col * 7 + row * 11) % colors.length];
}

export function canopyHeight(col: number, row: number): number {
	const t = 1 - Math.hypot(col - 14, row - 14) / (QR.length * 0.46);
	if (t <= 0) return 0;
	return 12 + Math.round(5 + 13 * t * t) + ((col * 7 + row * 3) % 4);
}

// Coalesce equal-colored modules into paths to keep the server-rendered SVG small.
const paths = new Map<string, string>();
for (let row = 0; row < QR.length; row++) {
	for (let col = 0; col < QR.length; col++) {
		if (QR[row][col] !== "1") continue;
		const fill = qrCellColor(col, row);
		paths.set(
			fill,
			(paths.get(fill) ?? "") +
				`M${col + QR_MARGIN},${row + QR_MARGIN}h1v1h-1z`,
		);
	}
}
export const QR_PATHS = Array.from(paths, ([fill, d]) => ({ fill, d }));
