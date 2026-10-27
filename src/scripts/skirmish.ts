/*
 * The nav's skirmish (src/components/Nav.astro), played by script: every 10s an invader crosses toward the
 * planet, which flashes and bursts it. The keyframes and timings are the CSS version's (which still plays
 * without JavaScript), played one pass at a time as Web Animations of transform and opacity, so they run
 * on the compositor. CSS animations that loop forever keep the page's thread busy every frame, and the
 * invader's leg swap (shapes inside an SVG) can't leave it at all: here the legs swap by a timer, only
 * while the invader is on screen. Each pass starts with a "pass" event on the run (scripts/arcade.ts waits
 * for one to bring the skirmish back after a game).
 */
type Kind = "squid" | "crab" | "octopus";

const LEGS_MS = 400; // each leg pose, as the CSS swap (0.8s for both)
const SEEN = [0.03, 0.4301]; // the share of the pass the invader is on screen

// Each keyframe's timing applies to the stretch after it, as with CSS
const ease = (frames: Keyframe[], easing: string) => frames.map((f) => ({ easing, ...f }));

export function initSkirmish(nav: HTMLElement) {
	const sky = nav.querySelector<HTMLElement>(".sky");
	const run = sky?.querySelector<HTMLElement>("[data-run]");
	const bolt = sky?.querySelector<HTMLElement>(".bolt");
	const boom = sky?.querySelector<HTMLElement>(".boom");
	const lit = nav.querySelector<Element>(".planet .lit");
	if (!sky || !run || !bolt || !boom || !lit) return;
	if (matchMedia("(prefers-reduced-motion: reduce)").matches) return; // the sky is hidden

	const seconds = (name: string) => parseFloat(getComputedStyle(nav).getPropertyValue(name)) * 1000;
	const cycle = seconds("--cycle");
	let delay = seconds("--delay");
	nav.classList.add("scripted"); // the CSS version stands down

	// The first pass is always the classic crab (set in the markup), so it's recognizable. After that, a
	// different kind on each pass, never the same one twice in a row, switched while it's invisible.
	const aliens: Kind[] = ["squid", "crab", "octopus"];
	const pick = (last?: string) => {
		const options = aliens.filter((kind) => kind !== last);
		return options[Math.floor(Math.random() * options.length)];
	};

	const pass = () => {
		// The firing range, as the sky's CSS has it now (it's shorter on phones)
		const range = getComputedStyle(boom).right;
		const timing = { duration: cycle, delay };
		delay = 0;
		const advance = run.animate(
			ease(
				[
					{ offset: 0, translate: "0 0", opacity: 0 },
					{ offset: 0.03, translate: "0 0", opacity: 0 },
					{ offset: 0.09, opacity: 1 },
					{ offset: 0.43, translate: `calc(100% - ${range}) 0`, opacity: 1 },
					{ offset: 0.4301, translate: `calc(100% - ${range}) 0`, opacity: 0 },
					{ offset: 1, translate: `calc(100% - ${range}) 0`, opacity: 0 },
				],
				"linear",
			),
			timing,
		);
		bolt.animate(
			ease(
				[
					{ offset: 0, translate: "0 -50%", opacity: 0 },
					{ offset: 0.4, translate: "0 -50%", opacity: 0 },
					{ offset: 0.4001, opacity: 1 },
					{ offset: 0.43, translate: `calc(-1 * ${range}) -50%`, opacity: 1 },
					{ offset: 0.4301, translate: `calc(-1 * ${range}) -50%`, opacity: 0 },
					{ offset: 1, translate: `calc(-1 * ${range}) -50%`, opacity: 0 },
				],
				"linear",
			),
			timing,
		);
		boom.animate(
			ease(
				[
					{ offset: 0, opacity: 0, scale: 0.7 },
					{ offset: 0.43, opacity: 0, scale: 0.7 },
					{ offset: 0.4301, opacity: 1, scale: 1 },
					{ offset: 0.48, opacity: 0, scale: 1.3 },
					{ offset: 1, opacity: 0, scale: 1.3 },
				],
				"ease",
			),
			timing,
		);
		lit.animate(
			ease(
				[
					{ offset: 0, opacity: 0 },
					{ offset: 0.393, opacity: 0 },
					{ offset: 0.402, opacity: 1 },
					{ offset: 0.474, opacity: 1 },
					{ offset: 0.528, opacity: 0 },
					{ offset: 1, opacity: 0 },
				],
				"ease",
			),
			timing,
		);

		// The legs swap while the invader is on screen, timed by the pass itself (whose clock moves once a
		// frame, so a check never comes sooner than a frame, and the pose is only written when it changes)
		const legs = () => {
			const t = Number(advance.currentTime ?? 0) - timing.delay;
			if (t >= SEEN[1] * cycle || advance.playState === "finished") return void delete run.dataset.pose;
			const pose = Math.floor(Math.max(0, t) / LEGS_MS) % 2 ? "b" : "a";
			if (run.dataset.pose !== pose) run.dataset.pose = pose;
			const next = t < SEEN[0] * cycle ? SEEN[0] * cycle - t : LEGS_MS - (t % LEGS_MS);
			setTimeout(legs, Math.max(next, 17));
		};
		legs();

		advance.finished.then(() => {
			run.dataset.kind = pick(run.dataset.kind);
			pass();
		});
		run.dispatchEvent(new Event("pass"));
	};
	pass();
}
