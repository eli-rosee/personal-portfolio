#!/usr/bin/env node
/*
 * npm run media: a poster for every clip in the projects' folders (src/content/projects/<slug>/assets/),
 * its first frame as a lossless WebP beside it ("run.mp4" -> "run.poster.webp"). The page shows it while
 * the clip loads (clips load only as they come near the screen), and the theater's strip uses it as the
 * clip's thumbnail. The frame is turned into colors the way browsers do it (through RGB, as a PNG would
 * be), so the poster matches the clip's first frame on screen. Commit the posters with the clips: the
 * server builds from git and doesn't need ffmpeg.
 *
 * Makes only what's missing or older than its clip. Needs ffmpeg on the PATH.
 */
import { execFileSync } from "node:child_process";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = "src/content/projects";
const clips = (dir) =>
	readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
		const path = join(dir, e.name);
		if (e.isDirectory()) return clips(path);
		return /\.(mp4|webm)$/i.test(e.name) ? [path] : [];
	});

let made = 0;
for (const slug of readdirSync(ROOT)) {
	const assets = join(ROOT, slug, "assets");
	if (!existsSync(assets)) continue;
	for (const clip of clips(assets)) {
		const poster = clip.replace(/\.(mp4|webm)$/i, ".poster.webp");
		if (existsSync(poster) && statSync(poster).mtimeMs >= statSync(clip).mtimeMs) continue;
		execFileSync("ffmpeg", ["-v", "error", "-y", "-i", clip, "-frames:v", "1", "-vf", "format=rgb24,format=bgra", "-c:v", "libwebp", "-lossless", "1", "-compression_level", "6", poster], { stdio: "inherit" });
		console.log(`Made ${poster}`);
		made++;
	}
}
console.log(made ? `${made} poster(s) made.` : "Every clip has an up-to-date poster.");
