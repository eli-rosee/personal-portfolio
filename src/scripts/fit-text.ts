/*
 * Text that must fit a fixed box ([data-fit]; the project hero's summary). It keeps its own size when
 * it fits, centered by the box. Text that doesn't fit steps down in size until it does (never below
 * MIN), then fills the box exactly, so its top and bottom edges are the same on every card: sizes
 * come in steps and lines come whole, so its lines are spread over what's left. Text still too long
 * at MIN shows the lines that fit, ending in an ellipsis. Refit whenever the box changes size and once
 * the fonts have loaded. A box with no fixed height (the hero on phones) always fits at full size.
 *
 * fitRow does the same for a row of buttons ([data-fit-row]): one row at full size if it fits, else a
 * step tighter at a time (.fit-1 to .fit-3, styled by the row's component), and wrapping only when
 * even the tightest doesn't fit.
 *
 * The box holds one element (the text, its leading trimmed by CSS) between two spacers; their
 * min-heights are the room kept clear over and under the text.
 */
const MIN = 14; // px, the small text size
const STEP = 0.5;

export function fitText(root: ParentNode) {
	root.querySelectorAll<HTMLElement>("[data-fit]").forEach((el) => {
		const text = el.firstElementChild as HTMLElement | null;
		if (!text) return;

		// The text's height as laid out: its box, less any trimming margins (the CSS fallback for
		// browsers without text-box)
		const height = () => {
			const s = getComputedStyle(text);
			return text.getBoundingClientRect().height + parseFloat(s.marginTop) + parseFloat(s.marginBottom);
		};
		const lineCount = () => {
			const range = document.createRange();
			range.selectNodeContents(text);
			return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
		};

		const fit = () => {
			el.style.fontSize = "";
			el.style.lineHeight = "";
			text.classList.remove("clamped");
			text.style.removeProperty("-webkit-line-clamp");
			// A box that grows with its text (the hero on phones) never needs fitting
			if (getComputedStyle(el).overflowY === "visible") return;

			const max = parseFloat(getComputedStyle(el).fontSize);
			let size = max;
			while (el.scrollHeight > el.clientHeight && size > MIN) {
				size = Math.max(MIN, size - STEP);
				el.style.fontSize = `${size}px`;
			}
			if (size === max) return;

			const room = (pseudo: string) => parseFloat(getComputedStyle(el, pseudo).minHeight) || 0;
			const space = el.clientHeight - room("::before") - room("::after");
			const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
			let lines = lineCount();
			// Still too long: keep the whole lines that fit (the first line's trimmed height, then a
			// line height for each line after it). The overflow test above works in whole pixels, so
			// allow half a pixel here.
			if (height() > space + 0.5) {
				const first = height() - (lines - 1) * lineHeight;
				lines = Math.max(1, Math.floor((space - first) / lineHeight) + 1);
				text.classList.add("clamped");
				text.style.setProperty("-webkit-line-clamp", String(lines));
			}
			if (lines < 2) return;
			el.style.lineHeight = `${lineHeight + (space - height()) / (lines - 1)}px`;
		};
		// The box's size comes from the card, not the text, so resizing the text doesn't refire this
		new ResizeObserver(fit).observe(el);
		document.fonts.ready.then(fit);
	});
}

const STEPS = ["fit-1", "fit-2", "fit-3"];

export function fitRow(root: ParentNode) {
	root.querySelectorAll<HTMLElement>("[data-fit-row]").forEach((row) => {
		// Measured by where the last item ends, not the row's scroll width (a hidden tooltip inside a
		// button would count there)
		const fits = () =>
			Math.max(...[...row.children].map((c) => c.getBoundingClientRect().right)) <= row.getBoundingClientRect().right + 0.5;
		const fit = () => {
			row.classList.remove(...STEPS);
			row.classList.add("one-row");
			for (const step of ["", ...STEPS]) {
				if (step) row.classList.add(step);
				if (fits()) return;
				if (step) row.classList.remove(step);
			}
			row.classList.remove("one-row");
		};
		new ResizeObserver(fit).observe(row.parentElement ?? row);
		document.fonts.ready.then(fit);
	});
}
