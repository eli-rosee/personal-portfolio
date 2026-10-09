/*
 * The dashed flight path from the statement's launch phrase to the landed rocket: a small pad ring
 * at the phrase, one smooth arc, and a chevron dropping straight onto the nose, with target
 * brackets around the rocket. Drawn into `svg` (absolutely positioned over `layout`) from the live
 * positions, and redrawn whenever the layout changes size.
 *
 * Two layouts: the card beside the text (the arc leaves the phrase's closing bracket and rises
 * before dropping onto the rocket), or below it (the arc leaves under the phrase and falls to the
 * rocket). Without JavaScript the svg stays empty.
 */

const NS = "http://www.w3.org/2000/svg";
const PAD_GAP = 14; // px from the phrase to the pad ring
const NOSE_GAP = 13; // px from the chevron's tip to the rocket's nose
const TEXT_GAP = 8; // px the arc keeps clear of the statement's lines
const BRACKET = { pad: 7, arm: 6 }; // px around the rocket; length of each corner's arms

const unit = (x: number, y: number): [number, number] => {
	const l = Math.hypot(x, y);
	return [x / l, y / l];
};
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const f = (n: number) => n.toFixed(1);

// Point t along the cubic p0..p3
const cubic = (p: number[][], t: number) =>
	[0, 1].map((k) => {
		const u = 1 - t;
		return u * u * u * p[0][k] + 3 * u * u * t * p[1][k] + 3 * u * t * t * p[2][k] + t * t * t * p[3][k];
	});

// The rendered lines of `el`'s visible text, one rect per line (hidden tooltips don't count)
const lineRects = (el: Element) => {
	const rects: DOMRect[] = [];
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		if (!node.textContent?.trim() || node.parentElement?.closest(".tooltip")) continue;
		const range = document.createRange();
		range.selectNodeContents(node);
		rects.push(...range.getClientRects());
	}
	return rects;
};

export function initLaunchArrow(
	svg: SVGSVGElement,
	layout: HTMLElement,
	phrase: HTMLElement,
	rocket: SVGElement,
	statement: Element,
) {
	const make = (tag: string, cls: string) => {
		const el = document.createElementNS(NS, tag);
		el.setAttribute("class", cls);
		svg.append(el);
		return el;
	};
	const path = make("path", "path");
	const pad = make("circle", "pad");
	const brackets = make("path", "brackets");
	const chevron = make("path", "chevron");
	pad.setAttribute("r", "3");

	const draw = () => {
		const base = layout.getBoundingClientRect();
		const btn = phrase.getBoundingClientRect();
		const ship = rocket.getBoundingClientRect();
		// Mid-flight the rocket isn't where it lands; the next resize after landing redraws
		if (rocket.closest(".flying") || !ship.width) return;
		const below = ship.top > btn.bottom + 40;

		const sx = below ? btn.left + btn.width * 0.55 - base.left : btn.right + PAD_GAP - base.left;
		const sy = below ? btn.bottom + 12 - base.top : btn.top + btn.height / 2 - base.top;
		const ex = ship.left + ship.width / 2 - base.left;
		const ey = ship.top - NOSE_GAP - base.top;
		const dist = Math.hypot(ex - sx, ey - sy);

		// Beside: leave rising to the right, as steeply as the statement's lines above allow (a long
		// first line can reach past the phrase). Below: leave falling, leaning toward the rocket.
		// The handles grow with the distance so the arc keeps its shape at every width.
		const lead = clamp(dist * (below ? 0.42 : 0.48), 30, below ? 90 : 110);
		const drop = clamp(dist * (below ? 0.42 : 0.58), 30, 110);
		const lines = lineRects(statement).map((r) => [
			r.left - base.left - TEXT_GAP,
			r.top - base.top - TEXT_GAP,
			r.right - base.left + TEXT_GAP,
			r.bottom - base.top + TEXT_GAP,
		]);
		const hits = (pts: number[][]) =>
			Array.from({ length: 41 }, (_, i) => cubic(pts, i / 40)).filter(([x, y]) =>
				lines.some(([l, t, r, b]) => x > l && x < r && y > t && y < b),
			).length;
		// The first shape that clears the text; failing that, the one that touches it least
		const rises = below ? [0] : [1.2, 0.8, 0.45, 0.1];
		let pts: number[][] = [];
		let fewest = Infinity;
		for (const rise of rises) {
			const [tx, ty] = below ? unit(clamp((ex - sx) / dist, -0.3, 0.3), 1) : unit(1, -rise);
			const shape = [[sx, sy], [sx + tx * lead, sy + ty * lead], [ex, ey - drop], [ex, ey]];
			const n = hits(shape);
			if (n < fewest) [pts, fewest] = [shape, n];
			if (!n) break;
		}
		const [p0, p1, p2, p3] = pts.map(([x, y]) => `${f(x)} ${f(y)}`);
		path.setAttribute("d", `M${p0} C${p1} ${p2} ${p3}`);
		pad.setAttribute("cx", f(sx));
		pad.setAttribute("cy", f(sy));
		chevron.setAttribute("d", `M${f(ex - 4.5)} ${f(ey - 5)}L${f(ex)} ${f(ey)}L${f(ex + 4.5)} ${f(ey - 5)}`);

		const x0 = ship.left - base.left - BRACKET.pad;
		const y0 = ship.top - base.top - BRACKET.pad;
		const x1 = ship.right - base.left + BRACKET.pad;
		const y1 = ship.bottom - base.top + BRACKET.pad - 4; // the fins stand on the card's edge
		const a = BRACKET.arm;
		brackets.setAttribute(
			"d",
			[
				[x0, y0 + a, x0, y0, x0 + a, y0],
				[x1 - a, y0, x1, y0, x1, y0 + a],
				[x0, y1 - a, x0, y1, x0 + a, y1],
				[x1 - a, y1, x1, y1, x1, y1 - a],
			]
				.map(([p, q, r, s, t, u]) => `M${f(p)} ${f(q)}L${f(r)} ${f(s)}L${f(t)} ${f(u)}`)
				.join(""),
		);
		svg.classList.add("drawn");
	};

	new ResizeObserver(draw).observe(layout);
	document.fonts.ready.then(draw);
	// After a flight the rocket is back on the pad; redraw in case the layout changed meanwhile
	const landing = rocket.closest(".landing");
	if (landing) new MutationObserver(draw).observe(landing, { attributes: true, attributeFilter: ["class"] });
}
