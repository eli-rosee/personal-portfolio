// The scenic-route flight's contrail (flight-path.ts), drawn off the page's thread on the canvas the page
// hands over, frame by frame until the dock. `start` is the flight's start in absolute time
// (timeOrigin + now), so the worker's clock matches the page's.
import { FLIGHT, clamp, contrail, type Path } from "./flight-path";

// Workers in some browsers have no requestAnimationFrame: a timer stands in
const frame = (fn: (now: number) => void) =>
	typeof requestAnimationFrame === "function" ? requestAnimationFrame(fn) : setTimeout(() => fn(performance.now()), 16);

onmessage = ({ data }: MessageEvent<{ canvas: OffscreenCanvas; width: number; height: number; dpr: number; path: Path; reach: number; start: number }>) => {
	const { canvas, width, height, dpr, path, reach, start } = data;
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d")!;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	const step = contrail(ctx, path, reach);
	const from = start - performance.timeOrigin;
	const tick = (now: number) => {
		const t = clamp((now - from) / FLIGHT);
		step(t);
		if (t < 1) frame(tick);
	};
	frame(tick);
};
