/*
 * The scenic-route flight's path and its contrail (src/scripts/flight.ts), shared with the worker that
 * draws the contrail off the page's thread (contrail-worker.ts), so both draw exactly the same trail.
 */
export const FLIGHT = 3400; // ms from liftoff to the dock

export const clamp = (t: number) => Math.min(1, Math.max(0, t));
// The climb off the pad: heavier and slower than easeInOut at the start, as the rocket fights gravity
const climb = (t: number) => (t < 0.5 ? 2 ** 2.5 * t ** 3.5 : 1 - Math.pow(-2 * t + 2, 3.5) / 2);
const bez = (a: number, b: number, c: number, d: number, t: number) => {
	const u = 1 - t;
	return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};
const dbez = (a: number, b: number, c: number, d: number, t: number) => {
	const u = 1 - t;
	return 3 * u * u * (b - a) + 6 * u * t * (c - b) + 3 * t * t * (d - c);
};

type Point = { x: number; y: number };
// The curve from the pad (P0) to the logo (P3), and the docked scale
export type Path = { P0: Point; P1: Point; P2: Point; P3: Point; dock: number };

// Where the rocket is at t (0 to 1 of the flight), its heading, and its scale
export const pose = ({ P0, P1, P2, P3, dock }: Path, t: number) => {
	const s = climb(t);
	const x = bez(P0.x, P1.x, P2.x, P3.x, s);
	const y = bez(P0.y, P1.y, P2.y, P3.y, s);
	const heading = (Math.atan2(dbez(P0.y, P1.y, P2.y, P3.y, s), dbez(P0.x, P1.x, P2.x, P3.x, s)) * 180) / Math.PI + 90;
	// The rocket shrinks to the logo's size along the whole flight, in step with the distance covered
	const scale = 1 + (dock - 1) * s;
	return { x, y, heading, scale };
};

/*
 * A short orange contrail behind the engine (`reach` px behind the rocket's middle at full size): one point
 * a frame, the last 11 joined by lines that thin and fade toward the tail, fading out near the dock.
 * Returns the step to call each frame with t; it clears only the box it drew in last.
 */
export const contrail = (ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, path: Path, reach: number) => {
	const trail: Point[] = [];
	let drawn: number[] | null = null;
	return (t: number) => {
		const p = pose(path, t);
		const rad = ((p.heading - 90) * Math.PI) / 180;
		trail.push({ x: p.x - Math.cos(rad) * reach * p.scale, y: p.y - Math.sin(rad) * reach * p.scale });
		if (trail.length > 11) trail.shift();
		if (drawn) ctx.clearRect(drawn[0], drawn[1], drawn[2] - drawn[0], drawn[3] - drawn[1]);
		const xs = trail.map((q) => q.x);
		const ys = trail.map((q) => q.y);
		drawn = [Math.min(...xs) - 3, Math.min(...ys) - 3, Math.max(...xs) + 3, Math.max(...ys) + 3]; // plus the line's width
		const fade = 1 - clamp((t - 0.75) / 0.2);
		for (let i = 1; i < trail.length; i++) {
			const a = i / trail.length;
			ctx.strokeStyle = `rgba(255, 168, 60, ${a * fade})`;
			ctx.lineWidth = 2.8 * a;
			ctx.lineCap = "round";
			ctx.beginPath();
			ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
			ctx.lineTo(trail[i].x, trail[i].y);
			ctx.stroke();
		}
	};
};
