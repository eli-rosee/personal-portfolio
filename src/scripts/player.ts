/*
 * Videos with sound (src/components/project/Player.astro), on their cards and in the theater: ▶ Play
 * or a click plays or pauses (on a card, a click off ▶ Play opens the theater, which theater.ts
 * handles); the bar slides up while the mouse moves, when the video starts and when it ends, and away
 * 2.5 s after that (or after the mouse leaves), taking the cursor with it until the mouse moves again
 * (the bar stays while paused); only one plays at a time; the line scrubs (drag it, and it holds still
 * until it's let go; or the arrow keys on it); the speaker mutes; the brackets go full screen (the
 * whole player, bar and all; Space plays or pauses there). Also gives each card its length ("Sound on ·
 * 1:23"). Runs again on the page swapped in after a flight.
 */
const pad = (n: number) => String(n).padStart(2, "0");
export const time = (s: number) => `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;

export function initPlayers(root: ParentNode = document) {
	root.querySelectorAll<HTMLElement>("[data-player]").forEach((player) => {
		const video = player.querySelector("video")!;
		const track = player.querySelector<HTMLElement>("[data-track]")!;
		const pp = player.querySelector<HTMLElement>("[data-pp]")!;
		const mute = player.querySelector<HTMLElement>("[data-mute]")!;
		const full = player.querySelector<HTMLElement>("[data-full]")!;
		const known = () => Number.isFinite(video.duration);

		// The line: moved every frame while it plays. The video's time only changes once per video frame
		// (and its events come about 4 times a second), so between changes it runs on the clock.
		const fill = track.querySelector<HTMLElement>(".fill")!;
		const knob = track.querySelector<HTMLElement>(".knob")!;
		let scrubbing = false;
		const timeText = player.querySelector("[data-time]")!;
		const draw = (t: number) => {
			const at = known() ? Math.min(1, t / video.duration) : 0;
			fill.style.width = `${at * 100}%`;
			knob.style.left = `${at * 100}%`;
			timeText.textContent = `${time(t)} / ${known() ? time(video.duration) : "0:00"}`;
		};
		// Between changes it runs on the clock, but only once the time is moving (a video takes a moment
		// to get going after Play), never more than a quarter second ahead, and never backwards
		let last = { t: -1, at: 0 };
		let moving = false;
		let shown = 0;
		const restart = () => {
			last = { t: -1, at: 0 };
			moving = false;
			shown = 0;
		};
		video.addEventListener("play", restart);
		video.addEventListener("seeking", restart);
		const line = (now?: number) => {
			let t = video.currentTime;
			if (now !== undefined) {
				if (t !== last.t) {
					moving = last.t >= 0;
					last = { t, at: now };
				} else if (moving) t = Math.min(last.t + ((now - last.at) / 1000) * video.playbackRate, last.t + 0.25);
				t = Math.max(t, shown);
				shown = t;
			}
			draw(t);
		};
		const glide = (now: number) => {
			if (video.paused) return line();
			line(now);
			requestAnimationFrame(glide);
		};
		video.addEventListener("play", () => requestAnimationFrame(glide));

		const paint = () => {
			// While it plays the frame loop moves the line, and while it's dragged the mouse does
			if (video.paused && !scrubbing) line();
			track.setAttribute("aria-valuenow", String(Math.round(video.currentTime)));
			if (known()) track.setAttribute("aria-valuemax", String(Math.round(video.duration)));
			player.classList.toggle("paused", video.paused);
			player.classList.toggle("playing", !video.paused);
			player.classList.toggle("muted", video.muted);
			pp.setAttribute("aria-label", video.paused ? "Play" : "Pause");
			mute.setAttribute("aria-label", video.muted ? "Sound on" : "Mute");
		};
		["timeupdate", "play", "pause", "volumechange", "loadedmetadata", "seeked", "ended"].forEach((e) =>
			video.addEventListener(e, paint),
		);
		// One video with sound at a time: starting this one pauses any other
		// The poster gives way once there's a frame to show (on Play, not before)
		video.addEventListener("playing", () => player.classList.add("started"));
		video.addEventListener("play", () => {
			document.querySelectorAll<HTMLVideoElement>("[data-player] video").forEach((v) => v !== video && v.pause());
		});
		paint();

		// The card's length, read from the video itself (some recordings don't say)
		const length = player.querySelector("[data-length]");
		const showLength = () => length && known() && (length.textContent = `Sound on · ${time(video.duration)}`);
		if (video.readyState >= 1) showLength();
		else video.addEventListener("loadedmetadata", showLength, { once: true });

		const toggle = () => (video.paused ? video.play().catch(() => {}) : video.pause());
		player.addEventListener("click", (e) => {
			// The bar's own controls do their own thing; on a card, a click off ▶ Play opens the theater
			if ((e.target as HTMLElement).closest(".bar, [data-theater]")) return;
			toggle();
		});
		pp.addEventListener("click", toggle);
		mute.addEventListener("click", () => (video.muted = !video.muted));

		// Full screen: the whole player, so the bar comes along. iPhones only let the bare video go full
		// screen, with the phone's own controls.
		const ios = video as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
		full.addEventListener("click", () => {
			if (document.fullscreenElement === player) document.exitFullscreen();
			else if (player.requestFullscreen) player.requestFullscreen().catch(() => {});
			else ios.webkitEnterFullscreen?.();
		});
		document.addEventListener("fullscreenchange", () => {
			const on = document.fullscreenElement === player;
			full.setAttribute("aria-label", on ? "Exit full screen" : "Full screen");
			// Space plays or pauses rather than pressing the button that had the focus
			if (on) (document.activeElement as HTMLElement | null)?.blur();
		});
		document.addEventListener("keydown", (e) => {
			if (e.key !== " " || document.fullscreenElement !== player || (e.target as HTMLElement).closest?.("button")) return;
			e.preventDefault();
			e.stopPropagation();
			toggle();
		});

		// The bar: up while the mouse moves over the video (or a key is used in it), and away 2.5 s after
		// that stops or the mouse leaves (taking the cursor with it, while it plays). Starting the video
		// and reaching its end show it and start the 2.5 s again.
		let idle: number | undefined;
		const rest = () => {
			clearTimeout(idle);
			player.classList.remove("awake");
		};
		const wake = () => {
			player.classList.add("awake");
			clearTimeout(idle);
			idle = window.setTimeout(rest, 2500);
		};
		player.addEventListener("mousemove", wake);
		player.addEventListener("keyup", wake);
		player.addEventListener("focusin", (e) => (e.target as HTMLElement).matches(":focus-visible") && wake());
		player.addEventListener("mouseleave", wake);
		video.addEventListener("play", wake);
		video.addEventListener("ended", wake);

		// Scrubbing: press anywhere on the line and drag; it holds still while the button is down and plays
		// on when it's let go, if it was playing. Arrow keys step 5 s. The line follows the mouse at once;
		// the picture is sought one seek at a time (each new one would cancel the last before it showed a
		// frame), always to where the mouse is now.
		let resume = false;
		let target: number | null = null;
		let busy = false;
		const next = () => {
			if (target === null) return void (busy = false);
			busy = true;
			video.currentTime = target;
			target = null;
		};
		video.addEventListener("seeked", next);
		const seek = (e: PointerEvent) => {
			const r = track.getBoundingClientRect();
			if (!known()) return;
			target = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * video.duration;
			draw(target);
			if (!busy) next();
		};
		track.addEventListener("pointerdown", (e) => {
			track.setPointerCapture(e.pointerId);
			resume = !video.paused;
			scrubbing = true;
			busy = false;
			player.classList.add("scrubbing");
			video.pause();
			seek(e);
		});
		track.addEventListener("pointermove", (e) => track.hasPointerCapture(e.pointerId) && seek(e));
		const release = () => {
			if (!scrubbing) return;
			scrubbing = false;
			player.classList.remove("scrubbing");
			// Whatever's still waiting goes at once, so it plays from where it was let go
			if (target !== null) video.currentTime = target;
			target = null;
			if (resume) video.play().catch(() => {});
		};
		track.addEventListener("pointerup", release);
		track.addEventListener("pointercancel", release);
		// A drag along the line isn't a swipe to the next item in the theater
		track.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: true });
		track.addEventListener("keydown", (e) => {
			if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
			e.stopPropagation();
			e.preventDefault();
			video.currentTime = Math.max(0, video.currentTime + (e.key === "ArrowRight" ? 5 : -5));
		});
	});
}
