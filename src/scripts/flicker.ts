/*
 * The engine's flicker, shared by every rocket's flame: a squash to 80% of the flame's length and back, in
 * two steps each way, about the top middle of the flame (the element's transform-origin), around and
 * around. `turn` is how far the drawing is turned (the logo's is 45°). A Web Animation rather than a CSS
 * one: an infinite CSS animation keeps the page's thread busy servicing it every frame. Run it on the
 * flame's own <svg>, not a shape inside one, so it stays on the compositor.
 */
export const flicker = (el: Element, ms: number, turn = 0) => {
	const squash = (y: number) => `rotate(${turn}deg) scaleY(${y}) rotate(${-turn}deg)`;
	return el.animate(
		[
			{ transform: squash(1), easing: "steps(2)" },
			{ transform: squash(0.8), offset: 0.5, easing: "steps(2)" },
			{ transform: squash(1) },
		],
		{ duration: ms, iterations: Infinity },
	);
};
