/*
 * The rocket launch on the About card. Clicking the statement's amber phrase lights the engine;
 * the rocket lifts off, pitches over to the logo's 45° as it climbs away and fades out, the flag
 * stands alone for a beat, then the rocket comes back down and brakes to a landing.
 * With reduced motion the engine just flickers in place.
 *
 * The rocket moves by inline transforms on each animation frame; nothing here touches layout.
 */

const MAX_HEIGHT = 245; // px of climb when there's room for it
const MIN_HEIGHT = 0.35 * MAX_HEIGHT;
const HEADING_CLEARANCE = 26; // px: the rocket's last trace fades out level with the heading's top

// Timeline (ms): ignite, climb, pause (gone), descend, settle. Climb and descent are for a full
// MAX_HEIGHT hop; shorter hops are quicker (time ~ √distance)
const IGNITE = 800;
const CLIMB = 4000;
const PAUSE = 1000;
const DESCEND = 3800;
const SETTLE = 450;
const DESCENT_START = 0.85; // the descent starts from this share of the climb's height
const ENTRY = 0.2; // the descent joins its speed curve this far in, already near full speed
const FADE = 0.16; // the landing fades in over this share of the descent; the takeoff fades out just as long
const REDUCED_MOTION_MS = 900;

// Pitch in degrees from vertical at progress p: a gravity turn, gradual the whole way up
const pitch = (p: number) => 45 * p ** 1.5;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
// Smooth at both ends, with the top speed at `peak`: speeds up over [0, peak], slows over [peak, 1]
const easePeak = (t: number, peak: number) =>
	t < peak
		? t - (peak / Math.PI) * Math.sin((Math.PI * t) / peak)
		: t + ((1 - peak) / Math.PI) * Math.sin((Math.PI * (t - peak)) / (1 - peak));

/*
 * The climb path, traced once at unit height. Distance along it grows as 2p³ − p⁴ (creeps off the
 * pad, builds speed, and the acceleration eases off at the top) while the heading follows pitch(p),
 * so the path is integrated step by step rather than drawn as a curve.
 */
const STEPS = 240;
const climbPath: [number, number][] = [[0, 0]];
for (let i = 1, x = 0, y = 0; i <= STEPS; i++) {
	const p = (i - 0.5) / STEPS;
	const speed = 6 * p ** 2 - 4 * p ** 3; // d/dp of 2p³ − p⁴
	const a = (pitch(p) * Math.PI) / 180;
	x += (speed * Math.sin(a)) / STEPS;
	y -= (speed * Math.cos(a)) / STEPS;
	climbPath.push([x, y]);
}
const pathTop = -climbPath[STEPS][1];
for (const point of climbPath) {
	point[0] /= pathTop;
	point[1] /= pathTop;
}

// Position on the unit climb path at progress p
const along = (p: number): [number, number] => {
	const f = p * STEPS;
	const k = Math.min(STEPS - 1, Math.floor(f));
	const [x0, y0] = climbPath[k];
	const [x1, y1] = climbPath[k + 1];
	return [x0 + (x1 - x0) * (f - k), y0 + (y1 - y0) * (f - k)];
};

/**
 * Wires `button` to launch the rocket in `landing` (which holds an svg.rocket with a .flame).
 * The climb is scaled to the sky between the landing and `ceiling`, so the rocket is gone by the
 * time it reaches it.
 */
export function initLaunch(button: HTMLElement, landing: HTMLElement, ceiling: HTMLElement | null) {
	const ship = landing.querySelector<SVGElement>(".rocket");
	const flame = ship?.querySelector<SVGElement>(".flame");
	if (!ship || !flame) return;

	let flying = false;
	let height = MAX_HEIGHT;
	let climbMs = CLIMB;
	let descendMs = DESCEND;
	let totalMs = 0;

	// Fits the flight to the room available; returns the sky that has to be on screen
	const measure = () => {
		const top = ceiling ? ceiling.getBoundingClientRect().top : -Infinity;
		const room = landing.getBoundingClientRect().bottom - top - HEADING_CLEARANCE;
		height = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, room));
		const scale = Math.sqrt(height / MAX_HEIGHT);
		climbMs = CLIMB * scale;
		descendMs = DESCEND * scale;
		totalMs = IGNITE + climbMs + PAUSE + descendMs + SETTLE;
		return height + ship.getBoundingClientRect().height;
	};

	// The rocket's pose `ms` into the flight
	const pose = (ms: number) => {
		let x = 0;
		let y = 0;
		let angle = 0;
		let opacity = 1;
		let burn = 0;
		if (ms < IGNITE) {
			const t = ms / IGNITE;
			burn = easeInOut(t);
			y = -Math.sin(t * Math.PI) * 1.5; // settles on its fins as it throttles up
		} else if (ms < IGNITE + climbMs) {
			const p = (ms - IGNITE) / climbMs;
			[x, y] = along(p);
			x *= height;
			y *= height;
			angle = pitch(p);
			burn = 1;
			const fade = (FADE * descendMs) / climbMs;
			opacity = 1 - easeInOut(clamp01((p - (1 - fade)) / fade));
		} else if (ms < IGNITE + climbMs + PAUSE) {
			opacity = 0;
		} else if (ms < totalMs - SETTLE) {
			const t = (ms - IGNITE - climbMs - PAUSE) / descendMs;
			// Comes in already moving (the curve's slow start is skipped, so it's never still while
			// it fades in), then brakes steadily to the ground
			const e0 = easePeak(ENTRY, 0.25);
			const u = (easePeak(ENTRY + t * (1 - ENTRY), 0.25) - e0) / (1 - e0);
			y = -DESCENT_START * height * (1 - u);
			opacity = easeInOut(clamp01(t / FADE));
			burn = 1 - 0.4 * easeInOut(clamp01((t - 0.6) / 0.4)); // throttles down near the ground
		} else {
			burn = 0.6 * (1 - easeInOut((ms - (totalMs - SETTLE)) / SETTLE));
		}
		ship.style.transform = `translate(${x}px, ${y}px) rotate(${angle}deg)`;
		ship.style.opacity = String(opacity);
		flame.style.opacity = String(burn);
	};

	const fly = () => {
		flying = true;
		landing.classList.add("flying");
		const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
		const duration = still ? REDUCED_MOTION_MS : totalMs;
		const start = performance.now();
		const tick = (now: number) => {
			const ms = now - start;
			if (still) flame.style.opacity = String(0.5 + 0.5 * Math.sin(ms / 40));
			else pose(Math.min(ms, totalMs));
			if (ms < duration) {
				requestAnimationFrame(tick);
				return;
			}
			ship.style.transform = ship.style.opacity = flame.style.opacity = "";
			landing.classList.remove("flying");
			flying = false;
		};
		requestAnimationFrame(tick);
	};

	button.addEventListener("click", () => {
		if (flying) return;
		// If the rocket or the sky it climbs into is out of view, scroll first and fly once settled
		const navBottom = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
		const sky = measure();
		const box = ship.getBoundingClientRect();
		if (box.bottom - sky >= navBottom && box.bottom <= innerHeight) return fly();

		const target = Math.min(navBottom + sky + 24, innerHeight - 40); // where the rocket's bottom should end up
		let started = false;
		const go = () => {
			if (started) return;
			started = true;
			fly();
		};
		addEventListener("scrollend", go, { once: true });
		setTimeout(go, 900); // browsers without scrollend
		scrollBy({ top: box.bottom - target, behavior: "smooth" });
	});
}
