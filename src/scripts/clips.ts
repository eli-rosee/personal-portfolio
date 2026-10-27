/*
 * Silent looping clips (video[data-clip], src/components/project/Visual.astro). A clip's file is attached
 * only as it comes within a screen of view (data-src becomes src), so a page of clips loads nothing up
 * front and nothing while a flight is still landing; until then its poster (the first frame) shows. Clips
 * play while on screen and pause off it and while the tab is hidden, so no clip decodes out of sight. With
 * reduced motion they show their first frame and wait. `signal` ends the watching when the page is
 * swapped out after a flight.
 */
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Gives a clip its file, once; `ahead` starts loading it before it plays
export function attach(video: HTMLVideoElement, ahead = false) {
	if (video.dataset.src && !video.getAttribute("src")) video.src = video.dataset.src;
	if (ahead) video.preload = "auto";
}

export function playClips(root: ParentNode = document, signal?: AbortSignal) {
	const clips = [...root.querySelectorAll<HTMLVideoElement>("video[data-clip]")];
	if (reduce) {
		// Held still: the poster is the first frame; without one, the clip's own first frame
		clips.forEach((v) => {
			if (v.poster) return;
			v.preload = "metadata";
			attach(v);
		});
		return;
	}
	const near = new IntersectionObserver(
		(entries) => {
			for (const { target, isIntersecting } of entries) {
				if (!isIntersecting) continue;
				attach(target as HTMLVideoElement, true);
				near.unobserve(target);
			}
		},
		{ rootMargin: "100% 0px" },
	);
	const shown = new Set<HTMLVideoElement>();
	const play = (v: HTMLVideoElement) => {
		attach(v);
		v.play().catch(() => {});
	};
	const watch = new IntersectionObserver((entries) => {
		for (const { target, isIntersecting } of entries) {
			const video = target as HTMLVideoElement;
			if (isIntersecting) {
				shown.add(video);
				if (!document.hidden) play(video);
			} else {
				shown.delete(video);
				video.pause();
			}
		}
	});
	clips.forEach((v) => {
		near.observe(v);
		watch.observe(v);
	});
	// A hidden tab pauses what's on screen; coming back plays it again (not a clip paused in the theater)
	document.addEventListener(
		"visibilitychange",
		() => shown.forEach((v) => (document.hidden ? v.pause() : !v.closest(".is-paused") && play(v))),
		{ signal },
	);
	signal?.addEventListener("abort", () => {
		near.disconnect();
		watch.disconnect();
	});
}
