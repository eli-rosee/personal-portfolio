// Small helpers for the live readouts in the footer.

/** Sets an element's text only when it changes (each write re-lays out the text). */
export const setText = (el: Element, text: string) => {
	if (el.textContent !== text) el.textContent = text;
};

/** Replays a one-shot CSS animation by taking its class off and putting it back. */
export const replayAnimation = (el: Element, className: string) => {
	el.classList.remove(className);
	void (el as HTMLElement).offsetWidth; // forces a style flush, so the re-added class starts over
	el.classList.add(className);
};

/**
 * Calls `render` up to 20 times a second while `target` is on screen, so fast-changing digits roll
 * smoothly, and once a second otherwise (off screen, or with reduced motion).
 */
export const renderLive = (render: () => void, target: Element) => {
	const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
	let onScreen = false;
	let frame = 0;
	let last = 0;

	const loop = (now: number) => {
		if (now - last >= 50) {
			last = now;
			render();
		}
		frame = requestAnimationFrame(loop);
	};
	const update = () => {
		cancelAnimationFrame(frame);
		if (onScreen && !reducedMotion.matches) frame = requestAnimationFrame(loop);
	};

	render();
	setInterval(render, 1000);
	reducedMotion.addEventListener("change", update);
	new IntersectionObserver(([entry]) => {
		onScreen = entry.isIntersecting;
		update();
	}).observe(target);
};
