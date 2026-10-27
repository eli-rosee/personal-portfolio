/*
 * The project page's ending (src/components/project/NextProject.astro). The dashed flight path from
 * "[take the scenic route]" to the rocket on its launchpad; and the flight: a T-3 countdown on the pad,
 * then one continuous climb up the page into the logo, while the page glides to the top and the next
 * project fades in under the rocket. The rocket docks in the logo.
 *
 * The next page is fetched, laid out and sized ("project:prepare") before it's shown, then its <main>
 * replaces this one, and a "project:swap" event lets the page's scripts wire up the new content. With
 * reduced motion the link just opens the next page.
 */

import { flicker } from "./flicker";
import { FLIGHT, clamp, contrail, pose, type Path } from "./flight-path";
import ContrailWorker from "./contrail-worker?worker";

const NS = "http://www.w3.org/2000/svg";
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const fx = (n: number) => n.toFixed(1);

const SCROLL_DELAY = 750; // ms after liftoff before the page starts to scroll
const BEAT = 1000; // ms per countdown beat: T-3, T-2, T-1 take a real 3 seconds

// The ink of a line of text (its letters, not its line box), from the font's own measurements
const ink = (el: HTMLElement) => {
	const text = el.textContent!.replace(/\s+/g, " ").trim();
	const cs = getComputedStyle(el);
	const g = document.createElement("canvas").getContext("2d")!;
	g.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
	const m = g.measureText(text);
	const range = document.createRange();
	range.selectNodeContents(el);
	const box = range.getClientRects()[0]; // the first line's content area: font ascent + descent
	if (!box) return null; // not laid out (yet)
	const baseline = box.top + m.fontBoundingBoxAscent;
	return { top: baseline - m.actualBoundingBoxAscent, bottom: baseline + m.actualBoundingBoxDescent, right: el.getBoundingClientRect().right };
};

/*
 * The flight path, in the home page's pieces (pad ring, dashes, a chevron at the rocket, target
 * brackets around the rocket and its launchpad), routed around the name: it runs out level from the
 * phrase, and only once past the name's ↗ does it climb into one long, shallow arc down to the rocket.
 * It also centers the rocket and its pad on the two lines of text.
 */
function drawPath(row: HTMLElement, phrase: HTMLElement) {
	const svg = row.querySelector<SVGSVGElement>(".launch-arrow")!;
	if (getComputedStyle(svg).display === "none") return;
	if (!svg.childElementCount)
		for (const c of ["path", "ring", "brackets", "chevron"]) {
			const el = document.createElementNS(NS, c === "ring" ? "circle" : "path");
			el.setAttribute("class", c);
			svg.append(el);
		}
	const [first, second] = [...row.querySelectorAll<HTMLElement>(".col .statement")].map(ink);
	if (!first || !second) return;

	// The same distance from the first line's letters to the top of the rocket and pad as from their
	// bottom to the second line's letters
	const launch = row.querySelector<HTMLElement>(".launch")!;
	const phone = getComputedStyle(row).flexDirection === "column"; // the launch under the text
	if (phone) launch.style.setProperty("--shift", "0px");
	const shift = parseFloat(launch.style.getPropertyValue("--shift") || "0");
	const ship = row.querySelector<SVGElement>(".rk")!.getBoundingClientRect();
	const pad = row.querySelector<SVGGraphicsElement>(".pad .base")!.getBoundingClientRect();
	const top = Math.min(ship.top, pad.top);
	const bottom = Math.max(ship.bottom, pad.bottom);
	const offset = phone ? 0 : (first.top + second.bottom) / 2 - (top + bottom) / 2;
	launch.style.setProperty("--shift", `${shift + offset}px`);

	const base = row.getBoundingClientRect();
	const ph = phrase.getBoundingClientRect();
	const X = (x: number) => x - base.left;
	const Y = (y: number) => y + offset - base.top; // where things are once the shift applies
	const P = (x: number, y: number) => `${fx(x)} ${fx(y)}`;

	// Brackets around the rocket and the whole pad
	const p = 7;
	const a = 6;
	const x0 = X(Math.min(ship.left, pad.left)) - p;
	const x1 = X(Math.max(ship.right, pad.right)) + p;
	const y0 = Y(top) - p;
	const y1 = Y(bottom) + p;
	svg.querySelector(".brackets")!.setAttribute(
		"d",
		[
			[x0, y0 + a, x0, y0, x0 + a, y0],
			[x1 - a, y0, x1, y0, x1, y0 + a],
			[x0, y1 - a, x0, y1, x0 + a, y1],
			[x1 - a, y1, x1, y1, x1, y1 - a],
		]
			.map(([q, r, s, t, u, v]) => `M${fx(q)} ${fx(r)}L${fx(s)} ${fx(t)}L${fx(u)} ${fx(v)}`)
			.join(""),
	);

	// Phones: the launch sits under the text, so the path drops from under the phrase, turns, and runs
	// level into the brackets' left side, as on desktop
	if (phone) {
		// Under the middle of the "a" in "take"
		const word = phrase.querySelector("em")!.firstChild!;
		const t = document.createRange();
		t.setStart(word, 1);
		t.setEnd(word, 2);
		const tr = t.getBoundingClientRect();
		const sx = X(tr.left + tr.width / 2);
		const sy = Y(second.bottom) + 14;
		const ym = Y(ship.top + ship.height / 2);
		const ex = x0 - 9; // the chevron's tip, just outside the brackets
		const r = 10;
		const ring = svg.querySelector(".ring")!;
		ring.setAttribute("r", "3");
		ring.setAttribute("cx", fx(sx));
		ring.setAttribute("cy", fx(sy));
		svg.querySelector(".path")!.setAttribute("d", `M${P(sx, sy + 3)}L${P(sx, ym - r)}Q${P(sx, ym)} ${P(sx + r, ym)}L${P(ex, ym)}`);
		svg.querySelector(".chevron")!.setAttribute("d", `M${P(ex - 5, ym - 4.5)}L${P(ex, ym)}L${P(ex - 5, ym + 4.5)}`);
		svg.classList.add("drawn");
		return;
	}

	// From beside the phrase, level with the middle of its letters, out past the end of the name
	const sx = X(ph.right) + 14;
	const sy = Y((second.top + second.bottom) / 2) - offset;
	const ym = Y(ship.top + ship.height / 2);
	const ex = X(Math.min(ship.left, pad.left)) - 7 - 9; // the chevron's tip, just outside the brackets
	const ceiling = first.top - base.top + 3;
	const nx = X(first.right) + 6; // past the name and its ↗
	const gap = Y(first.bottom) - offset + 3; // below this, the path runs under the first line's letters
	const run = 36; // the short level run into the chevron
	const xr = ex - run;
	// A crest just before the rocket. The climb and the descent are one ease scaled to their heights
	// (each side's width in proportion to its height), so both have the same slope, and the hump is the
	// same size whatever the name; the level run from the phrase takes up the rest. Only the part above
	// the gap between the lines has to clear the name: a long name steepens the hump (to 4 px across
	// per px of height at most), then turns it into one rise into the rocket, then a level line into
	// the pad.
	let crest = Math.max(ceiling + 6, Math.min(sy, ym) - 16);
	let end = ym;
	// Where the climb first reaches y, as a fraction of its width (the ease: handles at half its width)
	const reach = (y: number) => {
		const h = (sy - y) / (sy - crest);
		if (h <= 0) return 0;
		let t = 0.5;
		for (let lo = 0, hi = 1, i = 0; i < 20; i++, t = (lo + hi) / 2) (3 * t * t - 2 * t * t * t < h ? (lo = t) : (hi = t));
		return 1.5 * t * (1 - t) + t * t * t;
	};
	let xs = sx;
	let xc = sx;
	for (const shape of ["hump", "rise", "level"]) {
		if (shape === "rise") crest = ym;
		if (shape === "level") crest = end = sy;
		const up = sy - crest;
		const down = end - crest;
		if (!up && !down) break;
		const w = Math.min(xr - sx, 7 * (up + down)); // as gentle as the room allows, up to 7 px per px
		xs = xr - w;
		xc = xs + (w * up) / (up + down);
		if (w >= 4 * (up + down) && xs + (xc - xs) * reach(gap) >= nx) break;
	}
	if (crest === sy) xs = xc = xr;
	const ease = (x0: number, y0: number, x1: number, y1: number) =>
		x1 - x0 < 0.5 ? "" : `C${P((x0 + x1) / 2, y0)} ${P((x0 + x1) / 2, y1)} ${P(x1, y1)}`;
	svg.querySelector(".path")!.setAttribute(
		"d",
		`M${P(sx, sy)}L${P(xs, sy)}${ease(xs, sy, xc, crest)}${ease(xc, crest, xr, end)}L${P(ex, end)}`,
	);
	const ring = svg.querySelector(".ring")!;
	ring.setAttribute("r", "3");
	ring.setAttribute("cx", fx(sx));
	ring.setAttribute("cy", fx(sy));
	svg.querySelector(".chevron")!.setAttribute("d", `M${P(ex - 5, end - 4.5)}L${P(ex, end)}L${P(ex - 5, end + 4.5)}`);

	svg.classList.add("drawn");
}

// The next page's HTML, fetched and parsed ahead (the parse is the slowest part, and on a phone it froze
// the countdown): as the end of the page comes into view, in idle time
const parsed = new Map<string, Promise<Document>>();
const load = (url: string) => {
	let doc = parsed.get(url);
	if (!doc) {
		doc = fetch(url)
			.then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${r.status} ${url}`))))
			.then((html) => new DOMParser().parseFromString(html, "text/html"));
		doc.catch(() => parsed.delete(url)); // tried again at the click
		parsed.set(url, doc);
	}
	return doc;
};
const whenIdle = (fn: () => void) => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 200));

// The next page, made ready before it's shown: its <main> with any styles it needs, laid out out of sight
// over this one, sized, and its first screen's images decoded, so the crossfade itself is only opacity.
// Laying a whole page out is the slow part (a long task on a phone), so it's staged ahead, in idle time
// once the HTML is in: hidden, inert, and clipped to no height so it adds no room to scroll into.
type Staged = { incoming: HTMLElement; title: string };
const staged = new Map<string, Promise<Staged>>();
const place = (incoming: HTMLElement, old: HTMLElement) => {
	const r = old.getBoundingClientRect();
	Object.assign(incoming.style, { top: `${r.top + scrollY}px`, left: `${r.left}px`, width: `${r.width}px` });
};

async function build(url: string): Promise<Staged> {
	const doc = await load(url);
	const have = new Set([...document.querySelectorAll("style[data-vite-dev-id]")].map((s) => s.getAttribute("data-vite-dev-id")));
	doc.querySelectorAll("style[data-vite-dev-id]").forEach((s) => {
		if (!have.has(s.getAttribute("data-vite-dev-id"))) document.head.append(s.cloneNode(true));
	});
	const sheets = new Set([...document.querySelectorAll<HTMLLinkElement>("link[rel=stylesheet]")].map((l) => l.href));
	doc.querySelectorAll<HTMLLinkElement>("link[rel=stylesheet]").forEach((l) => {
		if (!sheets.has(l.href)) document.head.append(l.cloneNode(true));
	});
	const old = document.querySelector("main")!;
	const incoming = document.importNode(doc.querySelector("main")!, true);
	Object.assign(incoming.style, {
		position: "absolute",
		margin: "0",
		height: "0",
		overflow: "clip",
		visibility: "hidden",
		opacity: "0",
		pointerEvents: "none",
		zIndex: "1",
	});
	incoming.inert = true;
	place(incoming, old);
	old.after(incoming);
	// Only what's on its first screen is seen during the crossfade; the rest loads as it normally would
	const fold = incoming.getBoundingClientRect().top + innerHeight;
	const seen = [...incoming.querySelectorAll("img")].filter((i) => !i.closest("dialog") && i.getBoundingClientRect().top < fold);
	seen.forEach((i) => (i.loading = "eager"));
	// Sized now (its summary and buttons fit to the card), so it fades in as it will stay
	document.dispatchEvent(new CustomEvent("project:prepare", { detail: incoming }));
	await Promise.all(seen.map((i) => i.decode().catch(() => {})));
	return { incoming, title: doc.title };
}

const stage = (url: string) => {
	let next = staged.get(url);
	if (!next) {
		next = build(url);
		next.catch(() => staged.delete(url)); // tried again at the click
		staged.set(url, next);
	}
	return next;
};

// At the click: the staged page (or, if it isn't staged yet, the same work now, after the countdown's
// first frame so T-3 is up and the shake carries on through it), shown under the current one at opacity 0
async function prepare(url: string) {
	if (!staged.has(url)) await new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
	const { incoming, title } = await stage(url);
	staged.delete(url); // used up: a flight from the page it becomes stages its own
	const old = document.querySelector("main")!;
	place(incoming, old); // the window may have changed since
	Object.assign(incoming.style, { height: "", overflow: "", visibility: "", willChange: "opacity" });
	await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); // the sizing's first pass
	return { old, incoming, title };
}

// Where the logo's rocket is, and how big: the same drawing in an SVG whose viewBox is the turned
// drawing's bounding box, so the drawing's center (50, 62), turned 45°, is where the ship must land
const turn = ([x, y]: number[]) => [(x - y) * Math.SQRT1_2, (x + y) * Math.SQRT1_2];
function logoRocketPose(svg: SVGSVGElement, pageUnit: number) {
	const [x0, y0, , h] = svg.getAttribute("viewBox")!.split(" ").map(Number);
	const r = svg.getBoundingClientRect();
	const unit = r.height / h;
	const [cx, cy] = turn([50, 62]);
	const [fx, fy] = turn([50, 116]); // the top middle of the flame, where its flicker pivots
	return {
		x: r.left + (cx - x0) * unit,
		y: r.top + (cy - y0) * unit,
		scale: unit / pageUnit,
		rect: r,
		origin: [(cx - x0) * unit, (cy - y0) * unit],
		flame: [(fx - x0) * unit, (fy - y0) * unit],
	};
}

// T-3, T-2, T-1 over the pad while the engine throttles up and the rocket strains, shaking a little
// harder each beat; the fuel line drops away at T-2 and the service arms swing away at T-1, the status
// light flashes each beat and turns green at "Liftoff", and the flight starts right then
async function countdown(row: HTMLElement, rk: SVGSVGElement) {
	const craft = [...row.querySelectorAll<HTMLElement>(".craft, .burn")]; // the rocket, and its flame in front of the pad
	const flame = row.querySelector<SVGSVGElement>(".rk-flame")!;
	const label = document.createElement("span");
	label.className = "countdown";
	const brackets = row.querySelector<SVGGraphicsElement>(".launch-arrow .brackets");
	const box = brackets && getComputedStyle(row.querySelector(".launch-arrow")!).display !== "none" ? brackets.getBoundingClientRect() : rk.getBoundingClientRect();
	Object.assign(label.style, { left: `${box.left + box.width / 2 + scrollX}px`, top: `${box.top - 8 + scrollY}px` }); // in the page: it scrolls with the pad
	document.body.append(label);
	const show = (text: string) => {
		label.textContent = text;
		label.animate([{ opacity: 0, scale: 1.25 }, { opacity: 1, scale: 1 }], { duration: 180, easing: "ease-out" });
	};

	flame.style.transition = "opacity .5s ease-in-out";
	flicker(flame, 100);
	const light = row.querySelector<SVGSVGElement>(".pad-light");
	const k = rk.getBoundingClientRect().width / 25; // the shake grows with the rocket
	const lifts = [0.2, 0.45, 0.7].map((l) => l * k); // it barely rises before liftoff
	let shake: Animation[] = [];
	for (const [i, beat] of ["3", "2", "1"].entries()) {
		show(`T-${beat}`);
		flame.style.opacity = String(0.35 + i * 0.3);
		light?.animate([{ transform: "scale(1.6)" }, { transform: "scale(1)" }], { duration: 300, easing: "ease-out" });
		if (beat === "2") row.classList.add("fuel-off");
		if (beat === "1") row.classList.add("arms-back");
		const up = lifts[i];
		// A shake through the beat, mostly sideways, growing a little with each beat. Each beat's shake
		// replaces the last (stacked transform animations would all fall back to the main thread). The rocket
		// and its flame start together, so they shake as one.
		const frames = Array.from({ length: 16 }, (_, j) => j)
			.map((j) => ({ transform: `translate(${(j % 2 ? 1 : -1) * (0.35 + i * 0.13) * k}px, ${-up + (j % 3 === 0 ? 0.25 : -0.25) * k}px)` }))
			.concat({ transform: `translate(0, ${-up}px)` });
		const beatShake = craft.map((el) => el.animate(frames, { duration: BEAT, fill: "forwards" }));
		shake.forEach((a) => a.cancel());
		shake = beatShake;
		await wait(BEAT);
	}
	show("Liftoff");
	row.classList.add("go");
	flame.style.opacity = "1";
	setTimeout(() => label.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: "forwards" }).finished.then(() => label.remove()), 1000);
}

async function fly(button: HTMLElement) {
	const url = button.dataset.launch!;
	if (reduce) {
		location.href = url;
		return;
	}
	const html = document.documentElement;
	if (html.classList.contains("in-flight")) return; // one flight at a time
	html.classList.add("in-flight");
	// A video with sound stops at launch (it would play on through the countdown and cut out mid-flight)
	document.querySelectorAll<HTMLVideoElement>("[data-player] video").forEach((v) => v.pause());
	const ready = prepare(url);
	ready.catch(() => {}); // handled where it's awaited, after the countdown
	// The contrail's worker (below) starts now, so it's ready at liftoff. It says whether it can draw in
	// step with the screen's frames (Safari's workers can't: there it draws here, as the rocket does)
	const offthread = "transferControlToOffscreen" in HTMLCanvasElement.prototype && typeof Worker === "function";
	let worker = offthread ? new ContrailWorker() : undefined;
	let framed = false;
	if (worker) worker.onmessage = ({ data }) => (framed = !!data?.frames);

	const row = button.closest<HTMLElement>(".row")!;
	const rk = row.querySelector<SVGSVGElement>(".rk")!;
	await countdown(row, rk);
	row.classList.add("flying");

	// The flying rocket is a clone of the logo's own rocket, sitting exactly where the logo's rocket is;
	// the whole flight is a transform away from that spot, and at the dock the transform is zero, so the
	// two are drawn identically and the hand-over can't show
	const navRocket = document.querySelector<SVGSVGElement>("[data-logo-rocket]")!;
	const r0 = rk.getBoundingClientRect();
	const target = logoRocketPose(navRocket, r0.width / 100);
	// (as two layers, the hull and the flame, so the flame's flicker stays on the compositor)
	const ship = document.createElement("div");
	ship.className = "ship";
	for (const part of ["hull", "flame"]) {
		const layer = navRocket.cloneNode(true) as SVGSVGElement;
		layer.removeAttribute("data-logo-rocket");
		layer.querySelector(`.${part === "hull" ? "flame" : "hull"}`)!.remove();
		if (part === "flame") layer.classList.add("ship-flame");
		ship.append(layer);
	}
	const nr = target.rect;
	Object.assign(ship.style, {
		left: `${nr.left}px`,
		top: `${nr.top}px`,
		width: `${nr.width}px`,
		height: `${nr.height}px`,
		transformOrigin: `${target.origin[0]}px ${target.origin[1]}px`,
	});
	ship.style.setProperty("--fx", `${target.flame[0]}px`);
	ship.style.setProperty("--fy", `${target.flame[1]}px`);
	document.body.append(ship);
	flicker(ship.querySelector(".ship-flame")!, 120, 45); // the logo's drawing is turned 45°
	row.querySelectorAll<HTMLElement>(".craft, .burn").forEach((el) => (el.style.visibility = "hidden"));
	row.querySelector<SVGSVGElement>(".rk-flame")!.getAnimations().forEach((a) => a.cancel()); // hidden, so its flicker can stop
	// The logo's rocket leaves as this one takes off; it's back when the flight docks
	navRocket.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, delay: 250, easing: "ease-in", fill: "forwards" });

	// One curve from the pad to the logo: up, swinging left past the logo, then hooking up-right into its
	// 45° pose.
	const P0 = { x: r0.left + r0.width / 2, y: r0.top + r0.height / 2 };
	const P3 = { x: target.x, y: target.y };
	const hook = Math.min(160, innerHeight * 0.2);
	const path: Path = { P0, P1: { x: P0.x, y: P0.y - innerHeight * 0.5 }, P2: { x: P3.x - hook, y: P3.y + hook }, P3, dock: target.scale };
	const dock = path.dock;
	const at = (t: number) => pose(path, t);

	// The flight as one compositor animation (the curve sampled into keyframes), so it stays smooth while
	// the page underneath is busy; relative to the docked pose (the clone is already turned and logo-sized)
	const N = 90;
	const frames = Array.from({ length: N + 1 }, (_, i) => {
		const p = at(i / N);
		return { transform: `translate(${p.x - P3.x}px, ${p.y - P3.y}px) rotate(${p.heading - 45}deg) scale(${p.scale / dock})` };
	});
	const flight = ship.animate(frames, { duration: FLIGHT, easing: "linear", fill: "forwards" });
	const t0 = performance.now();

	// A short orange contrail follows the engine (flight-path.ts), on a canvas over the window: drawn in a
	// worker where the browser allows (OffscreenCanvas), so the page's thread doesn't repaint for it every
	// frame (in Firefox that repaint, over the crossfading pages, dropped frames near the dock); otherwise here
	// The canvas is exactly the window in CSS pixels (100vh on a phone is the height with the browser's bar
	// hidden, which stretched the trail off the rocket)
	const canvas = document.createElement("canvas");
	canvas.className = "contrail";
	Object.assign(canvas.style, { width: `${innerWidth}px`, height: `${innerHeight}px` });
	document.body.append(canvas);
	const size = { width: innerWidth * devicePixelRatio, height: innerHeight * devicePixelRatio, dpr: devicePixelRatio };
	const reach = r0.height * 0.42;
	let step: ((t: number) => void) | undefined;
	if (worker && !framed) {
		worker.terminate();
		worker = undefined;
	}
	if (worker) {
		const offscreen = canvas.transferControlToOffscreen();
		worker.postMessage({ canvas: offscreen, ...size, path, reach, start: performance.timeOrigin + t0 }, [offscreen]);
	} else {
		const ctx = canvas.getContext("2d")!;
		canvas.width = size.width;
		canvas.height = size.height;
		ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
		step = contrail(ctx, path, reach);
	}

	// The page glides to the top in the first half, after a moment's climb
	const from = scrollY;
	const tick = (now: number) => {
		const t = clamp((now - t0) / FLIGHT);
		const g = clamp((t - SCROLL_DELAY / FLIGHT) / (0.5 - SCROLL_DELAY / FLIGHT));
		if (g < 1) scrollTo({ top: from * (1 - easeInOut(g)), behavior: "instant" });
		step?.(t);
		// With the contrail in its worker, the frames stop once the glide is done
		if (t < 1 && (step || g < 1)) requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);

	// Halfway: the next project crossfades in under the rocket (opacity only; it's already laid out)
	await wait(FLIGHT * 0.5);
	let next: Awaited<typeof ready>;
	try {
		next = await ready;
	} catch {
		location.href = url; // the next page couldn't be fetched: go there the ordinary way
		return;
	}
	const { old, incoming, title } = next;
	old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 550, easing: "ease-in", fill: "forwards" });
	incoming.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: "ease-out", fill: "forwards" });

	await flight.finished;
	worker?.terminate();
	canvas.remove();
	// At the dock the logo's own rocket takes the ship's place, in the same pose
	navRocket.getAnimations().forEach((a) => a.cancel());
	ship.getAnimations({ subtree: true }).forEach((a) => a.cancel()); // its endless flicker would keep it alive
	ship.remove();

	// Then, with nothing left moving, the new page takes the old one's place (the same spot, so nothing
	// shifts; a whole page's layout is a long task on a phone, kept out of the flight), and its scripts
	// are wired up when the browser is next idle
	await new Promise((r) => setTimeout(r));
	old.remove();
	incoming.getAnimations().forEach((a) => a.cancel());
	incoming.removeAttribute("style");
	incoming.inert = false;
	document.title = title;
	history.pushState(null, "", url);
	shownPath = location.pathname;
	html.classList.remove("in-flight");
	whenIdle(() => document.dispatchEvent(new CustomEvent("project:swap", { detail: incoming })));
}

// Wires the launch buttons and the flight path in `root` (the page, or a swapped-in <main>); `signal`
// stops its observers when that page is swapped out
export function initFlight(root: ParentNode = document, signal?: AbortSignal) {
	root.querySelectorAll<HTMLElement>("[data-launch]").forEach((button) => {
		button.addEventListener("click", () => fly(button));
		if (!button.classList.contains("phrase")) return;
		const row = button.closest<HTMLElement>(".row")!;
		const draw = () => drawPath(row, button);
		const resized = new ResizeObserver(draw);
		resized.observe(row);
		signal?.addEventListener("abort", () => resized.disconnect());
		document.fonts.ready.then(draw);
		if (reduce) return; // the link just opens the page
		const ahead = new IntersectionObserver(
			([entry]) => {
				if (!entry.isIntersecting) return;
				ahead.disconnect();
				const url = button.dataset.launch!;
				whenIdle(() => load(url).then(() => whenIdle(() => !signal?.aborted && stage(url).catch(() => {})), () => {}));
			},
			{ rootMargin: "800px" },
		);
		ahead.observe(row);
		signal?.addEventListener("abort", () => ahead.disconnect());
	});
}

// Back and forward after a flight: the page is whatever the address now says (a step that only
// changes the #hash stays on this page)
let shownPath = location.pathname;
addEventListener("popstate", () => location.pathname !== shownPath && location.reload());
