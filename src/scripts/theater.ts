/*
 * The project page's theater (src/components/project/Theater.astro): opening an item, moving between
 * items (arrow keys, the strip, a swipe), stepping slides, zooming a still image with a mouse, and
 * pausing video on close. Also gives each video card its length. Runs again on the page swapped in after
 * a flight (`root` is the new <main>).
 */
const pad = (n: number) => String(n).padStart(2, "0");
const time = (s: number) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;

export function initTheater(root: ParentNode = document) {
	const dialog = root.querySelector<HTMLDialogElement>("[data-theater-dialog]");
	if (!dialog) return;
	const panes = [...dialog.querySelectorAll<HTMLElement>("[data-pane]")];
	const field = (name: string) => dialog.querySelector<HTMLElement>(`[data-${name}]:not([data-pane])`)!;
	let current = 0;

	// Video cards: "Sound on · 1:23", read from the video's own length (some recordings don't say)
	root.querySelectorAll<HTMLElement>("[data-duration]").forEach((meta) => {
		const video = dialog.querySelector<HTMLVideoElement>(`[data-pane="${meta.dataset.duration}"] video`);
		if (!video) return;
		const show = () => {
			if (Number.isFinite(video.duration)) meta.textContent = `Sound on · ${time(video.duration)}`;
		};
		video.preload = "metadata";
		if (video.readyState >= 1) show();
		else video.addEventListener("loadedmetadata", show, { once: true });
	});

	// Inside a deck, which slide is showing
	const slideOf = (pane: HTMLElement) => {
		const slides = [...pane.querySelectorAll<HTMLElement>(".slide")];
		return { slides, now: slides.findIndex((s) => !s.hidden) };
	};
	const showSlide = (pane: HTMLElement, n: number) => {
		const { slides } = slideOf(pane);
		slides.forEach((s, i) => (s.hidden = i !== n));
		pane.querySelector("[data-slide-count]")!.textContent = `${pad(n + 1)} / ${pad(slides.length)}`;
	};

	// About and Media sit side by side when both rows fit in full, otherwise stacked
	const strip = dialog.querySelector<HTMLElement>(".strip");
	const fit = () => {
		if (!strip || matchMedia("(max-width: 40rem)").matches) return dialog.classList.remove("stacked");
		const rows = [...strip.querySelectorAll<HTMLElement>(".thumbs")];
		const gap = parseFloat(getComputedStyle(strip).columnGap) || 0;
		const pad = parseFloat(getComputedStyle(strip).paddingLeft) + parseFloat(getComputedStyle(strip).paddingRight);
		const needed = rows.reduce((sum, r) => sum + r.scrollWidth, 0) + gap * (rows.length - 1) + pad;
		dialog.classList.toggle("stacked", rows.length > 1 && needed > innerWidth);
	};
	addEventListener("resize", fit);

	const show = (index: number, fromEnd = false) => {
		current = (index + panes.length) % panes.length;
		const pane = panes[current];
		dialog.querySelectorAll("video").forEach((v) => v.pause());
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

		dialog.querySelectorAll<HTMLElement>("[data-go]").forEach((t) => {
			const on = t.dataset.go === pane.dataset.pane;
			t.classList.toggle("on", on);
			if (on) t.scrollIntoView({ inline: "nearest", block: "nearest" });
		});
		if (pane.querySelector(".slide")) showSlide(pane, fromEnd ? slideOf(pane).slides.length - 1 : 0);
		// Everything in the item loads now (a deck's slides too), so nothing shows up blank
		pane.querySelectorAll<HTMLImageElement>("img[loading=lazy]").forEach((img) => (img.loading = "eager"));
		pane.classList.remove("is-paused");
		pane.querySelectorAll<HTMLVideoElement>("video[data-clip]").forEach((v) => v.play().catch(() => {}));
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
			dialog.showModal();
			fit();
			show(index);
		}),
	);
	dialog.querySelectorAll<HTMLElement>("[data-go]").forEach((t) =>
		t.addEventListener("click", () => show(panes.findIndex((p) => p.dataset.pane === t.dataset.go))),
	);
	dialog.querySelectorAll<HTMLElement>("[data-step]").forEach((b) =>
		b.addEventListener("click", () => {
			const pane = panes[current];
			const { slides, now } = slideOf(pane);
			showSlide(pane, Math.min(slides.length - 1, Math.max(0, now + Number(b.dataset.step))));
		}),
	);
	dialog.addEventListener("keydown", (e) => {
		if (e.key === "ArrowRight") step(1);
		if (e.key === "ArrowLeft") step(-1);
	});

	dialog.querySelector("[data-close]")?.addEventListener("click", () => dialog.close());
	// A click on the dimmed page around the screen closes it
	dialog.addEventListener("click", (e) => {
		const t = e.target as HTMLElement;
		if (t === dialog || t.classList.contains("stagebox")) dialog.close();
	});
	dialog.addEventListener("close", () => {
		dialog.querySelectorAll("video").forEach((v) => v.pause());
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
