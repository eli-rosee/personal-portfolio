/*
 * The nav's planet calls in an attack. Clicking it fades out the regular skirmish and sends three
 * waves of invaders down the bar's lane toward it, each faster and larger than the last. Space, or a
 * click anywhere on the bar but the logo, fires the planet's laser: the skirmish's own slow bolt,
 * straight along the lane, one on screen at a time (the arcade's rule), so a miss costs time. Squids
 * are fast, crabs average, octopuses slow but take two hits.
 *
 * A banner across the bar announces each wave and, at the end, the result; through the first wave a
 * line under the lane says how to fire, until the first hit. Clearing the third wave
 * wins: bursts across the bar and the planet's ring turns green. An invader touching the planet ends
 * the game: the invader is gone in the impact, the rest fade away, and the planet breaks apart, then
 * forms again. The skirmish returns on its next pass. Esc quits. Off with reduced motion.
 */
const WAVES = [
	{ count: 8, crossing: 3.6, gap: [750, 1150] },
	{ count: 10, crossing: 3.0, gap: [600, 950] },
	{ count: 12, crossing: 2.5, gap: [450, 800] },
];
const KINDS = {
	squid: { speed: 1.3, hp: 1 },
	crab: { speed: 1, hp: 1 },
	octopus: { speed: 0.8, hp: 2 },
} as const;
type Kind = keyof typeof KINDS;

const BOLT_CROSSING = 2.2; // seconds a bolt takes to cover the whole lane (speed follows the bar's width)
const COOLDOWN = 350; // ms between shots
const ANNOUNCE = 1300; // ms a wave's banner shows before its invaders come
const RESULT = 3000; // ms the result shows

const TEXT = { wave: (n: number) => `Wave ${n}`, won: "Victory", lost: "Game over" };

type Foe = { el: HTMLElement; kind: Kind; x: number; hp: number; half: number };
type Bolt = { el: HTMLElement; x: number };

const between = ([a, b]: number[]) => a + Math.random() * (b - a);
const pick = (r = Math.random()): Kind => (r < 0.25 ? "squid" : r < 0.65 ? "crab" : "octopus");

export function initArcade(header: HTMLElement) {
	const button = header.querySelector<HTMLButtonElement>("[data-planet]");
	const planet = button?.querySelector<HTMLElement>(".planet");
	const sky = header.querySelector<HTMLElement>(".sky");
	const run = header.querySelector<HTMLElement>("[data-run]");
	const fx = header.querySelector<HTMLElement>("[data-fx]");
	const home = header.querySelector<HTMLElement>(".home");
	if (!button || !planet || !sky || !run || !fx || !home) return;
	if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
		button.disabled = true;
		return;
	}

	const protos = Object.fromEntries(
		[...run.querySelectorAll<SVGElement>(".invader")].map((el) => [el.dataset.kind, el]),
	) as Record<Kind, SVGElement>;
	const burstPath = sky.querySelector(".boom path")?.getAttribute("d") ?? "";

	let phase: "idle" | "announce" | "play" | "over" = "idle";
	let wave = 0;
	let spawned = 0;
	let foes: Foe[] = [];
	let bolts: Bolt[] = [];
	let last = 0;
	let nextSpawn = 0;
	let lastShot = 0;
	let timers: number[] = [];
	const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));

	// Positions in the effects layer's coordinates (it covers the header). The lane runs from where
	// invaders appear (the sky's left edge) to the planet's ring.
	const lane = () => {
		const o = fx.getBoundingClientRect();
		const s = sky.getBoundingClientRect();
		const p = planet.getBoundingClientRect();
		const h = home.getBoundingClientRect();
		return {
			start: s.left - o.left,
			line: p.left - o.left + p.width * 0.1,
			muzzle: p.left - o.left + p.width * 0.2,
			y: p.top - o.top + p.height / 2,
			cx: p.left - o.left + p.width / 2,
			mid: (h.right + p.left) / 2 - o.left, // between the logo and the planet, for the banner
			px: getComputedStyle(sky).getPropertyValue("--px").trim() || "2px",
		};
	};

	const flash = (cls: "firing" | "won", ms: number) => {
		planet.classList.add(cls);
		setTimeout(() => planet.classList.remove(cls), ms);
	};

	const burst = (x: number, y: number) => {
		const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		el.setAttribute("viewBox", "0 0 9 7");
		el.setAttribute("shape-rendering", "crispEdges");
		el.classList.add("burst");
		el.style.setProperty("--px", lane().px);
		el.style.translate = `${x}px ${y}px`;
		el.innerHTML = `<path d="${burstPath}"/>`;
		fx.append(el);
		el.animate([{ opacity: 1, scale: 1 }, { opacity: 0, scale: 1.3 }], { duration: 500, easing: "ease-out" }).onfinish = () => el.remove();
	};

	const fadeOut = (el: Element) => (el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300 }).onfinish = () => el.remove());

	// How to fire, under the lane (halfway down to the bar's bottom edge) until the first hit
	let tip: HTMLElement | null = null;
	const showTip = () => {
		const { mid, y } = lane();
		const below = (header.getBoundingClientRect().bottom - fx.getBoundingClientRect().top - y) / 2;
		tip = document.createElement("span");
		tip.className = "tipline";
		tip.innerHTML = "<b>Space</b> or <b>click</b> to fire";
		tip.style.translate = `${mid}px ${y + below}px`;
		fx.append(tip);
		tip.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
	};
	const dropTip = () => {
		if (tip) fadeOut(tip);
		tip = null;
	};

	// Words across the bar, between the logo and the planet
	const banner = (text: string, tone: "text" | "accent", ms: number) => {
		const { mid, y } = lane();
		const el = document.createElement("span");
		el.className = `banner ${tone}`;
		el.textContent = text;
		el.style.translate = `${mid}px ${y}px`;
		fx.append(el);
		el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 0.9 }, { opacity: 0 }], { duration: ms }).onfinish = () => el.remove();
	};

	const fire = () => {
		const now = performance.now();
		if (phase !== "play" || bolts.length || now - lastShot < COOLDOWN) return;
		lastShot = now;
		const el = document.createElement("span");
		el.className = "bolt";
		fx.append(el);
		bolts.push({ el, x: lane().muzzle });
		flash("firing", 250);
	};

	const spawn = () => {
		const { start, px } = lane();
		const kind = pick();
		const el = document.createElement("span");
		el.className = "foe";
		el.style.setProperty("--px", px);
		el.append(protos[kind].cloneNode(true));
		fx.append(el);
		foes.push({ el, kind, x: start, hp: KINDS[kind].hp, half: 0 });
		spawned++;
	};

	const tick = (now: number) => {
		if (phase !== "play") return;
		const dt = Math.min(0.05, (now - last) / 1000);
		last = now;
		const { start, line, y } = lane();
		const W = WAVES[wave - 1];
		if (spawned < W.count && now >= nextSpawn) {
			spawn();
			nextSpawn = now + between(W.gap);
		}

		const pace = (line - start) / W.crossing;
		for (const foe of foes) {
			foe.x += pace * KINDS[foe.kind].speed * dt;
			foe.half ||= foe.el.offsetWidth / 2 - 10; // the sprite, without its padding
			foe.el.style.translate = `${foe.x}px ${y}px`;
		}

		for (const bolt of [...bolts]) {
			bolt.x -= ((line - start) / BOLT_CROSSING) * dt;
			bolt.el.style.translate = `${bolt.x}px ${y}px`;
			// The first invader in its way: the one nearest the planet
			const hit = foes.filter((f) => Math.abs(f.x - bolt.x) <= f.half).sort((a, b) => b.x - a.x)[0];
			if (hit) {
				bolts = bolts.filter((b) => b !== bolt);
				bolt.el.remove();
				if (--hit.hp > 0) {
					hit.el.classList.add("hurt");
					setTimeout(() => hit.el.classList.remove("hurt"), 160);
					continue;
				}
				foes = foes.filter((f) => f !== hit);
				hit.el.remove();
				dropTip();
				burst(hit.x, y);
			} else if (bolt.x < start) {
				bolts = bolts.filter((b) => b !== bolt);
				fadeOut(bolt.el);
			}
		}

		// The front of an invader touching the ring: it's lost in the impact
		const through = foes.find((f) => f.x + f.half >= line);
		if (through) {
			foes = foes.filter((f) => f !== through);
			through.el.remove();
			return over(false);
		}
		if (spawned === W.count && !foes.length) {
			bolts.forEach((b) => fadeOut(b.el));
			bolts = [];
			return wave === WAVES.length ? over(true) : announce(wave + 1);
		}
		requestAnimationFrame(tick);
	};

	const announce = (n: number) => {
		phase = "announce";
		wave = n;
		spawned = 0;
		banner(TEXT.wave(n), "text", ANNOUNCE);
		if (n === 1) showTip();
		else dropTip();
		later(() => {
			phase = "play";
			last = nextSpawn = performance.now();
			requestAnimationFrame(tick);
		}, ANNOUNCE);
	};

	// The planet breaks into pixels that drift apart and fade, then forms again
	const shatter = () => {
		const { cx, y } = lane();
		planet.classList.add("shattered");
		for (let i = 0; i < 14; i++) {
			const bit = document.createElement("span");
			bit.className = i % 3 ? "debris" : "debris lit";
			fx.append(bit);
			const a = Math.random() * Math.PI * 2;
			const r = 20 + Math.random() * 30;
			bit.animate(
				[
					{ translate: `${cx}px ${y}px`, opacity: 1 },
					{ translate: `${cx + Math.cos(a) * r}px ${y + Math.sin(a) * r * 0.7}px`, opacity: 0 },
				],
				{ duration: 900 + Math.random() * 500, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)", fill: "forwards" },
			).onfinish = () => bit.remove();
		}
		later(() => planet.classList.remove("shattered"), 1800);
	};

	const over = (won: boolean) => {
		phase = "over";
		dropTip();
		[...foes, ...bolts].forEach((x) => fadeOut(x.el));
		foes = [];
		bolts = [];
		const { start, line, y } = lane();
		banner(won ? TEXT.won : TEXT.lost, won ? "accent" : "text", RESULT);
		if (won) {
			flash("won", 1800);
			for (let i = 0; i < 6; i++) later(() => burst(start + (0.15 + Math.random() * 0.7) * (line - start), y + (Math.random() * 2 - 1) * 16), i * 180);
		} else shatter();
		later(finish, RESULT);
	};

	// The skirmish fades back in on its next pass, so its invader never pops in mid-flight
	const finish = () => {
		phase = "idle";
		button.classList.remove("playing");
		const back = (event: AnimationEvent) => {
			if (event.target !== run || phase !== "idle") return;
			sky.classList.remove("off");
			planet.classList.remove("calm");
			run.removeEventListener("animationiteration", back);
		};
		run.addEventListener("animationiteration", back);
	};

	const start = () => {
		timers.forEach(clearTimeout);
		timers = [];
		lastShot = 0;
		sky.classList.add("off");
		planet.classList.add("calm");
		button.classList.add("playing");
		announce(1);
	};

	const quit = () => {
		dropTip();
		timers.forEach(clearTimeout);
		timers = [];
		[...foes, ...bolts].forEach((x) => fadeOut(x.el));
		foes = [];
		bolts = [];
		planet.classList.remove("shattered", "won");
		fx.querySelectorAll(".banner").forEach((el) => el.remove());
		finish();
	};

	header.addEventListener("click", (event) => {
		const target = event.target as Node;
		if (phase === "idle") {
			if (button.contains(target)) start();
			return;
		}
		if (home.contains(target) || event.detail === 0) return; // a key on the planet is handled below
		fire();
	});
	addEventListener("keydown", (event) => {
		if (phase === "idle" || event.defaultPrevented) return;
		if (event.key === "Escape") return quit();
		if (event.key === " " || (event.key === "Enter" && event.target === button)) {
			event.preventDefault(); // no page scroll, no second press on the button
			if (!event.repeat) fire();
		}
	});
}
