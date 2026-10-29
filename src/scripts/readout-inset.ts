/*
 * The inset at the ends of a project's readout row (.readouts, desktop only): full while the values
 * have plenty of room between them, shrinking as they crowd together, and gone once they're close, so
 * a row of four reaches the ends of the hero's bevels instead of floating inside them. Measured from
 * the room the values would have with no inset; refit whenever the row changes size and once the
 * fonts have loaded. Without JavaScript the CSS inset stays.
 *
 * `signal` stops the refitting when the page is swapped out after a flight.
 */
const MAX = 32; // px, the CSS inset
const ROOMY = 160; // px between values at which the full inset holds
const TIGHT = 96; // px between values at which the inset is gone

export function fitReadoutInset(root: ParentNode, signal?: AbortSignal) {
	const row = root.querySelector<HTMLElement>(".readouts");
	if (!row) return;
	const cells = [...row.children] as HTMLElement[];
	if (cells.length < 2) return;

	const fit = () => {
		const s = getComputedStyle(row);
		if (s.flexWrap !== "nowrap") return row.style.removeProperty("--inset"); // phones wrap instead
		const gap = parseFloat(s.columnGap);
		const room = row.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
		const values = cells.reduce((sum, c) => sum + c.getBoundingClientRect().width, 0);
		// The space between neighbouring values with no inset: the gap plus an even share of what's left
		// (the two end spacers bring a gap each)
		const between = gap + (room - values - (cells.length + 1) * gap) / (cells.length - 1);
		const share = Math.min(1, Math.max(0, (between - TIGHT) / (ROOMY - TIGHT)));
		row.style.setProperty("--inset", `${(share * MAX).toFixed(1)}px`);
	};

	const resized = new ResizeObserver(fit);
	resized.observe(row);
	signal?.addEventListener("abort", () => resized.disconnect());
	document.fonts.ready.then(fit);
}
