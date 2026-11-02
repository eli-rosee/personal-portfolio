/*
 * Silent looping clips (video[data-clip], src/components/project/Visual.astro). A clip's file and its
 * poster (the first frame) are attached only as it comes within a screen of view (data-src and
 * data-poster become src and poster; a poster attribute loads at once, even out of sight), so a page of
 * clips loads nothing up front and nothing while a flight is still landing; the poster shows until the
 * clip plays. Clips play while on screen and pause off it and while the tab is hidden, so no clip decodes
 * out of sight. With reduced motion they show their first frame and wait. `signal` ends the watching when
 * the page is swapped out after a flight.
 */
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Gives a clip its poster, once
const showPoster = (video: HTMLVideoElement) => {
	if (video.dataset.poster && !video.getAttribute("poster")) video.poster = video.dataset.poster;
};

// Gives a clip its poster and file, once; `ahead` starts loading it before it plays
export function attach(video: HTMLVideoElement, ahead = false) {
	showPoster(video);
	if (video.dataset.src && !video.getAttribute("src")) video.src = video.dataset.src;
	if (ahead) video.preload = "auto";
}

export function playClips(root: ParentNode = document, signal?: AbortSignal) {
	const clips = [...root.querySelectorAll<HTMLVideoElement>("video[data-clip]")];
	const near = new IntersectionObserver(
		(entries) => {
			for (const { target, isIntersecting } of entries) {
				if (!isIntersecting) continue;
				const video = target as HTMLVideoElement;
				near.unobserve(video);
				if (!reduce) attach(video, true);
				// Held still: the poster is the first frame; without one, the clip's own first frame
				else if (video.dataset.poster || video.poster) showPoster(video);
				else {
					video.preload = "metadata";
					attach(video);
				}
			}
		},
		{ rootMargin: "100% 0px" },
	);
	clips.forEach((v) => near.observe(v));
	signal?.addEventListener("abort", () => near.disconnect());
	if (reduce) return;
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
	clips.forEach((v) => watch.observe(v));
	// A hidden tab pauses what's on screen; coming back plays it again (not a clip paused in the theater)
	document.addEventListener(
		"visibilitychange",
		() => shown.forEach((v) => (document.hidden ? v.pause() : !v.closest(".is-paused") && play(v))),
		{ signal },
	);
	signal?.addEventListener("abort", () => watch.disconnect());
}
