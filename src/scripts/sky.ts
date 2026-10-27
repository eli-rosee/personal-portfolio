/*
 * The starfield's sky (src/components/Starfield.astro): faint stars drifting slowly to the left, drawn
 * 15 times a second. Runs in a worker on an OffscreenCanvas where the browser has one, so the page's
 * own thread never draws it; otherwise on the page itself. The page says when the canvas resizes and
 * when the drift should run (not while scrolling, during a flight, in a hidden tab or with reduced
 * motion).
 */
type Star = { x: number; y: number; r: number; alpha: number; speed: number };
type Context = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const DENSITY = 1 / 5000; // stars per square CSS pixel
const MIN_STARS = 150; // small screens would otherwise get only ~70
const MAX_SPEED = 4; // px per second for the nearest (largest) stars
const FRAME_MS = 1000 / 15; // the drift is so slow (a quarter pixel a redraw at most) that 15 fps looks the same as 60

// Workers in some browsers have no requestAnimationFrame: a timer stands in
const frame = (fn: (now: number) => void): number =>
	typeof requestAnimationFrame === "function" ? requestAnimationFrame(fn) : (setTimeout(() => fn(performance.now()), 0) as unknown as number);
const cancelFrame = (id: number) => (typeof cancelAnimationFrame === "function" ? cancelAnimationFrame(id) : clearTimeout(id));

export function sky(ctx: Context, starColor: string) {
	const canvas = ctx.canvas;
	let stars: Star[] = [];
	let width = 0;
	let height = 0;
	let id = 0;
	let wake = 0;
	let last = 0;

	// Bigger stars are brighter and drift faster, a cheap parallax effect
	const makeStar = (x: number): Star => {
		const depth = Math.random() ** 2; // most stars are small and far away
		return {
			x,
			y: Math.random() * height,
			r: 0.3 + depth * 0.9,
			alpha: 0.2 + depth * 0.5,
			speed: MAX_SPEED * (0.15 + depth * 0.85),
		};
	};

	const draw = () => {
		ctx.clearRect(0, 0, width, height);
		ctx.fillStyle = starColor;
		for (const star of stars) {
			ctx.globalAlpha = star.alpha;
			ctx.beginPath();
			ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
			ctx.fill();
		}
	};

	// The next frame is asked for just before it's due (the browser's frame after the timer)
	const next = () => {
		wake = setTimeout(() => (id = frame(tick)), FRAME_MS - 4) as unknown as number;
	};

	const stop = () => {
		clearTimeout(wake);
		cancelFrame(id);
	};

	const tick = (now: number) => {
		const dt = Math.min((now - last) / 1000, 0.1); // cap the jump after a long pause
		last = now;
		for (const star of stars) {
			star.x -= star.speed * dt;
			// A star leaving on the left is replaced by a new one on the right
			if (star.x < -star.r) Object.assign(star, makeStar(width + star.r));
		}
		draw();
		next();
	};

	return {
		// The canvas's CSS size and pixel density (capped at 2x: the stars are smaller than a pixel, so more
		// buys nothing)
		size(w: number, h: number, dpr: number) {
			width = w;
			height = h;
			if (width === canvas.width / dpr && height === canvas.height / dpr) return;
			canvas.width = Math.round(width * dpr);
			canvas.height = Math.round(height * dpr);
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			const count = Math.max(MIN_STARS, Math.round(width * height * DENSITY));
			stars = Array.from({ length: count }, () => makeStar(Math.random() * width));
			draw();
		},
		run(on: boolean) {
			stop();
			if (!on) return;
			last = performance.now();
			next();
		},
	};
}

export type Sky = ReturnType<typeof sky>;
