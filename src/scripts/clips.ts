/*
 * Silent looping clips (video[data-clip]) play while they're on screen and pause off it, so a page of
 * them doesn't decode video out of sight. With reduced motion they show their first frame and wait.
 */
export function playClips(root: ParentNode = document, signal?: AbortSignal) {
	if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	const watch = new IntersectionObserver((entries) => {
		for (const { target, isIntersecting } of entries) {
			const video = target as HTMLVideoElement;
			if (isIntersecting) video.play().catch(() => {});
			else video.pause();
		}
	});
	root.querySelectorAll<HTMLVideoElement>("video[data-clip]").forEach((v) => watch.observe(v));
	signal?.addEventListener("abort", () => watch.disconnect());
}
