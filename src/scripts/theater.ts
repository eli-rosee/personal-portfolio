/*
 * The project page's theater (src/components/project/Theater.astro): opening an item, moving between
 * items (arrow keys, the strip, a swipe), stepping slides, zooming a still image with a mouse, and
 * carrying a video between its card and the theater. Runs again on the page swapped in after
 * a flight (`root` is the new <main>; `signal` ends this page's window listener when it's swapped out).
 */
import { attach } from "./clips";

const pad = (n: number) => String(n).padStart(2, "0");

export function initTheater(root: ParentNode = document, signal?: AbortSignal) {
	const dialog = root.querySelector<HTMLDialogElement>("[data-theater-dialog]");
	if (!dialog) return;
	const panes = [...dialog.querySelectorAll<HTMLElement>("[data-pane]")];
	const field = (name: string) => dialog.querySelector<HTMLElement>(`[data-${name}]:not([data-pane])`)!;
	let current = 0;

	// A video has one player, which lives on its card and is carried into the theater while it's shown
	// there: the same video, at the same moment, with nothing to load or keep in step. Its card spot, by id:
	const homes = new Map<string, HTMLElement>();
	root.querySelectorAll<HTMLElement>("[data-player]").forEach((p) => homes.set(p.dataset.player!, p.parentElement!));
	const playerOf = (pane: HTMLElement) => root.querySelector<HTMLElement>(`[data-player="${pane.dataset.pane}"]`);
	// Players back to their cards, except the one in `keep`; `pause` stops them on the way
	const sendHome = (keep: HTMLElement | null, pause: boolean) =>
		dialog.querySelectorAll<HTMLElement>("[data-player]").forEach((p) => {
			if (keep?.contains(p)) return;
			if (pause) p.querySelector("video")!.pause();
			homes.get(p.dataset.player!)?.append(p);
		});

	// Inside a deck, which slide is showing
	const slideOf = (pane: HTMLElement) => {
		const slides = [...pane.querySelectorAll<HTMLElement>(".slide")];
		return { slides, now: slides.findIndex((s) => !s.hidden) };
	};
	const showSlide = (pane: HTMLElement, n: number) => {
		const { slides } = slideOf(pane);
		slides.forEach((s, i) => (s.hidden = i !== n));
		field("slide-count").textContent = `${pad(n + 1)} / ${pad(slides.length)}`;
	};

	// About and Media sit side by side when both rows fit in full, otherwise stacked
	const strip = dialog.querySelector<HTMLElement>(".strip");
	const fit = () => {
		if (!dialog.open) return; // measured again when it opens
		if (!strip || matchMedia("(max-width: 40rem)").matches) return dialog.classList.remove("stacked");
		const rows = [...strip.querySelectorAll<HTMLElement>(".thumbs")];
		const gap = parseFloat(getComputedStyle(strip).columnGap) || 0;
		const pad = parseFloat(getComputedStyle(strip).paddingLeft) + parseFloat(getComputedStyle(strip).paddingRight);
		const needed = rows.reduce((sum, r) => sum + r.scrollWidth, 0) + gap * (rows.length - 1) + pad;
		dialog.classList.toggle("stacked", rows.length > 1 && needed > innerWidth);
	};
	addEventListener("resize", fit, { signal });

	const show = (index: number, fromEnd = false) => {
		current = (index + panes.length) % panes.length;
		const pane = panes[current];
		// Moving on stops what was playing; a video moved away from goes back to its card
		sendHome(pane, true);
		dialog.querySelectorAll("video").forEach((v) => !pane.contains(v) && v.pause());
		panes.forEach((p) => (p.hidden = p !== pane));
		dialog.classList.remove("zoomed");
		dialog.dataset.shape = pane.dataset.shape;

		// Where you are, counted within the item's group
		const group = panes.filter((p) => p.dataset.group === pane.dataset.group);
		field("group").textContent = pane.dataset.group ?? "";
		field("count").textContent = `${pad(group.indexOf(pane) + 1)} / ${pad(group.length)}`;
		field("title").textContent = pane.dataset.title ?? "";
		field("caption").textContent = pane.dataset.caption ?? "";
		field("hint").textContent = pane.dataset.hint ?? "";
		// A deck shows its counter and PDF in the hint's corner
		dialog.classList.toggle("on-slides", !!pane.querySelector(".slide"));
		const pdf = field("deck-pdf") as HTMLAnchorElement;
		pdf.hidden = !pane.dataset.deckPdf;
		if (pane.dataset.deckPdf) pdf.href = pane.dataset.deckPdf;

		dialog.querySelectorAll<HTMLElement>("[data-go]").forEach((t) => {
			const on = t.dataset.go === pane.dataset.pane;
			t.classList.toggle("on", on);
			if (on) t.scrollIntoView({ inline: "nearest", block: "nearest" });
		});
		if (pane.querySelector(".slide")) showSlide(pane, fromEnd ? slideOf(pane).slides.length - 1 : 0);
		// Everything in the item loads now (a deck's slides too), so nothing shows up blank
		pane.querySelectorAll<HTMLImageElement>("img[loading=lazy]").forEach((img) => (img.loading = "eager"));
		pane.classList.remove("is-paused");
		pane.querySelectorAll<HTMLVideoElement>("video[data-clip]").forEach((v) => {
			attach(v);
			v.play().catch(() => {});
		});
		// A video's player comes over from its card at the same moment, paused (▶ Play or a click starts it)
		const player = playerOf(pane);
		if (player) {
			if (player.parentElement !== pane) pane.append(player);
			player.querySelector("video")!.pause();
		}
	};

	// Inside a deck the arrows step the slides; past either end they move on to the next item
	const step = (by: number) => {
		const pane = panes[current];
		if (pane.querySelector(".slide")) {
			const { slides, now } = slideOf(pane);
			if (now + by >= 0 && now + by < slides.length) return showSlide(pane, now + by);
		}
		show(current + by, by < 0);
	};

	root.querySelectorAll<HTMLElement>("[data-theater]").forEach((el) =>
		el.addEventListener("click", (e) => {
			e.preventDefault();
			const index = panes.findIndex((p) => p.dataset.pane === el.dataset.theater);
			if (index < 0) return;
			// Opening the theater pauses every video, the one coming along from its card too
			root.querySelectorAll<HTMLVideoElement>("[data-player] video").forEach((v) => v.pause());
			dialog.showModal();
			// The focus goes to the theater itself, not Close (which Space would press), so Space plays a video
			dialog.focus();
			fit();
			show(index);
		}),
	);
	dialog.querySelectorAll<HTMLElement>("[data-go]").forEach((t) =>
		t.addEventListener("click", () => show(panes.findIndex((p) => p.dataset.pane === t.dataset.go))),
	);
	const touch = matchMedia("(pointer: coarse)").matches;
	dialog.querySelectorAll<HTMLElement>("[data-step]").forEach((b) =>
		b.addEventListener("click", () => {
			const pane = panes[current];
			const { slides, now } = slideOf(pane);
			// On a touch screen a tap anywhere on the slide moves forward (a swipe goes back)
			const by = b.classList.contains("half") && touch ? 1 : Number(b.dataset.step);
			// The slide's halves and the ‹ › loop inside the deck: past the last slide is the first again
			showSlide(pane, (now + by + slides.length) % slides.length);
		}),
	);
	dialog.addEventListener("keydown", (e) => {
		// Full screen is the video's alone (player.ts handles its keys)
		if (document.fullscreenElement) return;
		if (e.key === "ArrowRight") step(1);
		if (e.key === "ArrowLeft") step(-1);
		// Space plays or pauses a video (unless a button has the focus, which Space presses)
		const video = panes[current].querySelector<HTMLVideoElement>("[data-player] video");
		if (e.key === " " && video && !(e.target as HTMLElement).closest("button")) {
			e.preventDefault();
			if (video.paused) video.play().catch(() => {});
			else video.pause();
		}
	});

	dialog.querySelector("[data-close]")?.addEventListener("click", () => dialog.close());
	// A click on the dimmed page around the screen closes it
	dialog.addEventListener("click", (e) => {
		const t = e.target as HTMLElement;
		if (t === dialog || t.classList.contains("stagebox")) dialog.close();
	});
	dialog.addEventListener("close", () => {
		dialog.querySelectorAll<HTMLVideoElement>("video:not([data-player] video)").forEach((v) => v.pause());
		// A video goes back to its card at the same moment, paused
		sendHome(null, true);
		dialog.classList.remove("zoomed");
	});

	// With a mouse, a click zooms a still image 2x where it's clicked; the zoom follows the pointer
	const stage = dialog.querySelector<HTMLElement>(".stage .screen")!;
	const fine = matchMedia("(pointer: fine)").matches;
	const aim = (e: MouseEvent) => {
		const r = stage.getBoundingClientRect();
		panes[current].style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
	};
	stage.addEventListener("click", (e) => {
		const pane = panes[current];
		// A clip: a click (or tap) pauses or resumes it
		const clip = pane.classList.contains("clip") ? pane.querySelector("video") : null;
		if (clip) {
			if (clip.paused) clip.play().catch(() => {});
			else clip.pause();
			pane.classList.toggle("is-paused", clip.paused);
			field("hint").textContent = clip.paused ? "Click to play" : "Click to pause";
			return;
		}
		if (!fine || !pane.classList.contains("zoomable")) return;
		aim(e);
		dialog.classList.toggle("zoomed");
	});
	stage.addEventListener("mousemove", (e) => {
		if (dialog.classList.contains("zoomed")) aim(e);
	});

	// On a touch screen, a swipe across the screen moves to the next or previous item
	let x0: number | null = null;
	stage.addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
	stage.addEventListener("touchend", (e) => {
		if (x0 === null) return;
		const dx = e.changedTouches[0].clientX - x0;
		x0 = null;
		if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
	});
}
