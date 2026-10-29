/*
 * The progress readout over a write-up clip with {values=N} (.clip-hud, src/components/project/FigureRow.astro):
 * the count of values passed so far (N spread evenly over the clip), and the bar's
 * --progress. Updated every frame while the clip plays and once on a seek, so nothing runs while it's
 * paused or off screen. `signal` ends the listening when the page is swapped out after a flight.
 */
export function initClipHuds(root: ParentNode, signal?: AbortSignal) {
	root.querySelectorAll<HTMLElement>(".clip-hud").forEach((hud) => {
		const video = hud.parentElement?.querySelector<HTMLVideoElement>("video");
		const count = hud.querySelector(".n");
		if (!video || !count) return;
		const total = Number(hud.dataset.values);

		const show = () => {
			const progress = video.duration ? video.currentTime / video.duration : 0;
			hud.style.setProperty("--progress", progress.toFixed(4));
			count.textContent = Math.round(progress * total).toLocaleString("en-US");
		};
		const track = () => {
			show();
			if (!video.paused) requestAnimationFrame(track);
		};
		video.addEventListener("play", track, { signal });
		video.addEventListener("seeked", show, { signal });
	});
}
