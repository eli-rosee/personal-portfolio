#!/usr/bin/env node
/*
 * npm run slides <slug> <deck.pptx> [folder]: a project's slide deck from its PowerPoint file. The deck lives
 * in the project's assets/ folder; this fills assets/<folder>/ (default "slides") with one image per slide
 * (slide-01.png, …) and writes the deck's PDF beside it (deck.pptx -> deck.pdf), the files a Media "slides"
 * card points to. A slide with a GIF or video on it becomes a clip instead (slide-05.mp4): the slide with
 * its animation laid back over it, where the deck places it, playing once. A clip over MAX_MB stays a
 * still. Posters for the clips come from `npm run media`, run at the end.
 *
 * Needs PowerPoint (run from WSL on the Windows machine with Office: it exports a copy of the deck through
 * powershell.exe, so an open deck is fine), ffmpeg and unzip.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const [slug, deckName, folder = "slides"] = process.argv.slice(2);
if (!slug || !deckName) {
	console.error("Usage: npm run slides <slug> <deck.pptx> [folder]");
	process.exit(1);
}
const MAX_MB = 12; // the largest a moving slide's clip may be
const WIDTH = 1920; // px, each slide's export
const assets = `src/content/projects/${slug}/assets`;
const deck = join(assets, deckName);
if (!existsSync(deck)) throw new Error(`No deck at ${deck}.`);

// A working folder Windows can reach: the deck is exported from a copy there
const work = "/mnt/c/Temp/portfolio-slides";
const win = "C:\\Temp\\portfolio-slides";
rmSync(work, { recursive: true, force: true });
mkdirSync(join(work, "png"), { recursive: true });
cpSync(deck, join(work, "deck.pptx"));

console.log("Exporting the slides through PowerPoint…");
writeFileSync(
	join(work, "export.ps1"),
	`$ppt = New-Object -ComObject PowerPoint.Application
$deck = $ppt.Presentations.Open("${win}\\deck.pptx", $true, $false, $false)
$i = 1
foreach ($s in $deck.Slides) { $s.Export(("${win}\\png\\slide-{0:D2}.png" -f $i), "PNG", ${WIDTH}, ${Math.round((WIDTH * 9) / 16)}); $i++ }
$deck.SaveAs("${win}\\deck.pdf", 32)
$deck.Close()
`,
);
execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", `${win}\\export.ps1`], { stdio: "inherit" });
const pngs = readdirSync(join(work, "png")).sort();

// The deck's own files: each slide's XML, what it links to, and the media
execFileSync("unzip", ["-q", "-o", join(work, "deck.pptx"), "ppt/presentation.xml", "ppt/slides/*", "ppt/media/*", "-d", join(work, "x")]);
const x = join(work, "x", "ppt");
const [, slideW] = readFileSync(join(x, "presentation.xml"), "utf8").match(/<p:sldSz cx="(\d+)"/);
const px = (emu) => Math.round((Number(emu) * WIDTH) / Number(slideW)); // EMU -> px of the export

// The GIF or video on slide n, where the deck places it, or undefined
const animation = (n) => {
	const rels = readFileSync(join(x, "slides", "_rels", `slide${n}.xml.rels`), "utf8");
	const moving = [...rels.matchAll(/<Relationship [^>]*>/g)]
		.map(([r]) => ({ id: r.match(/Id="([^"]+)"/)[1], target: r.match(/Target="([^"]+)"/)[1] }))
		.filter((r) => /\.(gif|mp4|m4v|mov|webm|wmv|avi)$/i.test(r.target));
	if (!moving.length) return undefined;
	const xml = readFileSync(join(x, "slides", `slide${n}.xml`), "utf8");
	const pics = (xml.match(/<p:pic>[\s\S]*?<\/p:pic>/g) ?? []).filter((pic) => moving.some((m) => pic.includes(`"${m.id}"`)));
	if (pics.length > 1) console.warn(`  Slide ${n}: ${pics.length} animations; only the first is laid over it.`);
	const pic = pics[0];
	if (!pic) return undefined;
	const media = moving.find((m) => pic.includes(`"${m.id}"`));
	const [, ox, oy] = pic.match(/<a:off x="(-?\d+)" y="(-?\d+)"/);
	const [, cx, cy] = pic.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
	const crop = Object.fromEntries(["l", "t", "r", "b"].map((k) => [k, Number(pic.match(new RegExp(`<a:srcRect[^>]* ${k}="(-?\\d+)"`))?.[1] ?? 0) / 100000]));
	return { file: join(x, "slides", media.target), x: px(ox), y: px(oy), w: px(cx), h: px(cy), crop };
};

const out = join(work, "out");
mkdirSync(out);
pngs.forEach((png, i) => {
	const n = i + 1;
	const still = join(work, "png", png);
	const anim = animation(n);
	if (!anim) return cpSync(still, join(out, png));
	const clip = join(out, png.replace(/\.png$/, ".mp4"));
	const { l, t, r, b } = anim.crop;
	console.log(`  Slide ${n}: laying ${basename(anim.file)} over it…`);
	execFileSync("ffmpeg", [
		"-v", "error", "-y", "-loop", "1", "-i", still, "-i", anim.file,
		"-filter_complex",
		`[1:v]crop=iw*${1 - l - r}:ih*${1 - t - b}:iw*${l}:ih*${t},scale=${anim.w}:${anim.h}[a];[0:v][a]overlay=${anim.x}:${anim.y}:shortest=1,fps=30,format=yuv420p`,
		"-an", "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-movflags", "+faststart", clip,
	]);
	const mb = statSync(clip).size / 1e6;
	if (mb > MAX_MB) {
		console.warn(`  Slide ${n}: its clip is ${mb.toFixed(0)} MB (over ${MAX_MB}), so it stays a still.`);
		rmSync(clip);
		cpSync(still, join(out, png));
	}
});

// Replace the folder's slides (and their posters) and the PDF
const dest = join(assets, folder);
mkdirSync(dest, { recursive: true });
for (const f of readdirSync(dest)) if (/^slide-\d+\./.test(f)) rmSync(join(dest, f));
for (const f of readdirSync(out)) cpSync(join(out, f), join(dest, f));
const pdf = deckName.replace(/\.pptx?$/i, ".pdf");
cpSync(join(work, "deck.pdf"), join(assets, pdf));
console.log(`${pngs.length} slides in ${dest}/, and ${join(assets, pdf)}.`);

execFileSync("node", ["scripts/media.mjs"], { stdio: "inherit" });
