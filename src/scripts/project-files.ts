/*
 * Turns a project's folder (src/content/projects/<slug>/) into what its page shows: the files its
 * fields point to, and its write-up split into About sections and figure rows.
 *
 * The write-up (the Markdown under the fields):
 *   ## Heading                 starts a section; the heading sits in the label column beside it
 *   text, **bold**, links      the section's text (src/components/Prose.astro)
 *   ![alt](file "Caption")     on a line of its own: a framed figure under the text. Images, GIFs and
 *                              .mp4 / .webm clips (silent loops). Two or three such lines together (no
 *                              blank line between) sit side by side at one height. {effects=true} after
 *                              it adds the screen's grade and glass.
 *   <!-- notes -->             left out of the page
 *
 * Every file lives in the project's assets/ folder, named by its path there ("plot.png", "slides/"). In a draft a missing file becomes a labeled gap on the
 * page, so a fresh template previews right away; in a published project it stops the build.
 */
import type { CollectionEntry } from "astro:content";
import { readFileSync } from "node:fs";
import { createSatteriMarkdownProcessor } from "@astrojs/markdown-satteri";
import { linkTooltips, listLabels } from "./markdown";

type Project = CollectionEntry<"projects">;

const ROOT = "/src/content/projects";
const images = import.meta.glob<{ default: ImageMetadata }>("/src/content/projects/*/**/*.{png,jpg,jpeg,webp,avif}", {
	eager: true,
});
const urls = import.meta.glob<string>("/src/content/projects/*/**/*.{gif,mp4,webm,pdf}", {
	eager: true,
	query: "?url",
	import: "default",
});

// What a file field turns into: an image (optimized by Astro), a GIF or video clip (served as is), any
// other file by URL, or a gap where a draft's file is still missing
export type Asset =
	| { kind: "image"; image: ImageMetadata }
	| { kind: "gif"; src: string; width: number; height: number }
	| { kind: "clip"; src: string; width?: number; height?: number }
	| { kind: "file"; src: string }
	| { kind: "missing"; path: string };

// "plot.png", "./plot.png" and "assets/plot.png" all mean the same file
const clean = (path: string) => path.replace(/^\.\//, "").replace(/^assets\//, "");
const keyOf = (slug: string, path: string) => `${ROOT}/${slug}/assets/${clean(path)}`;

// Finds `path` in the project's folder. `as` says what it must be: "visual" (an image, GIF or clip), "image"
// (a still), "video" or "file" (anything, linked by URL).
function find(project: Project, path: string, where: string, as: "visual" | "image" | "video" | "file"): Asset {
	const slug = project.id;
	const ext = path.split(".").pop()!.toLowerCase();
	const allowed = {
		visual: ["png", "jpg", "jpeg", "webp", "avif", "gif", "mp4", "webm"],
		image: ["png", "jpg", "jpeg", "webp", "avif"],
		video: ["mp4", "webm"],
		file: ["png", "jpg", "jpeg", "webp", "avif", "gif", "mp4", "webm", "pdf"],
	}[as];
	if (!allowed.includes(ext))
		throw new Error(`Project "${slug}": ${path} (${where}) should be one of: ${allowed.map((e) => "." + e).join(", ")}.`);

	const key = keyOf(slug, path);
	const image = images[key]?.default;
	const url = urls[key];
	if (!image && !url) {
		if (project.data.draft) return { kind: "missing", path };
		throw new Error(
			`Project "${slug}": can't find ${path} (${where}). Put it in src/content/projects/${slug}/assets/, or mark the project \`draft: true\` while it's missing.`,
		);
	}
	if (as === "file") return { kind: "file", src: url ?? image!.src };
	if (image) return { kind: "image", image };
	if (ext === "gif") {
		// Its size, from the GIF header, so a row of figures can be laid out before it loads
		const head = readFileSync(`.${key}`);
		return { kind: "gif", src: url!, width: head.readUInt16LE(6), height: head.readUInt16LE(8) };
	}
	return { kind: "clip", src: url!, ...videoSize(`.${key}`) };
}

/*
 * A video's display size, read from the file so a clip's frame can match its shape before it loads:
 * MP4's track header (turned for phone videos stored sideways with a rotation), or WebM's PixelWidth and
 * PixelHeight. Undefined when the file doesn't say.
 */
function videoSize(path: string): { width: number; height: number } | undefined {
	const buf = readFileSync(path);
	// MP4: the first video track header ('tkhd') with a size
	for (let at = buf.indexOf("tkhd"); at > 0; at = buf.indexOf("tkhd", at + 4)) {
		const v1 = buf[at + 4] === 1;
		const matrix = at + 4 + 4 + (v1 ? 32 : 20) + 8 + 8;
		const width = buf.readUInt32BE(matrix + 36) / 65536;
		const height = buf.readUInt32BE(matrix + 40) / 65536;
		if (!width || !height) continue;
		const turned = buf.readInt32BE(matrix) === 0; // a = 0: rotated 90° or 270°
		return turned ? { width: height, height: width } : { width, height };
	}
	// WebM: the Video element (0xE0) holds PixelWidth (0xB0) and PixelHeight (0xBA)
	const vint = (i: number) => {
		let len = 1;
		while (len <= 8 && !(buf[i] & (0x80 >> (len - 1)))) len++;
		let value = buf[i] & (0xff >> len);
		for (let k = 1; k < len; k++) value = value * 256 + buf[i + k];
		return { len, value };
	};
	for (let at = buf.indexOf(0xe0); at >= 0 && at < buf.length - 16; at = buf.indexOf(0xe0, at + 1)) {
		const size = vint(at + 1);
		if (size.value > 64) continue;
		let i = at + 1 + size.len;
		const end = i + size.value;
		const found: Record<number, number> = {};
		while (i < end && i < buf.length) {
			const id = buf[i];
			const len = vint(i + 1);
			let value = 0;
			for (let k = 0; k < len.value && k < 4; k++) value = value * 256 + buf[i + 1 + len.len + k];
			found[id] = value;
			i += 1 + len.len + len.value;
		}
		if (found[0xb0] && found[0xba]) return { width: found[0xb0], height: found[0xba] };
	}
	return undefined;
}

// An image's or clip's shape for its frame: portrait when taller than wide, otherwise landscape (also when
// the size isn't known, or the file is missing)
export const shapeOf = (asset: Asset): "landscape" | "portrait" => {
	const size = asset.kind === "image" ? asset.image : asset.kind === "gif" || asset.kind === "clip" ? asset : undefined;
	return size?.width && size.height && size.height > size.width ? "portrait" : "landscape";
};

/* ---------- The display screen ---------- */

export type Display = { asset: Asset; alt: string; fit: "crop" | "whole"; position: string; zoom: number; effects: boolean };

export const display = (project: Project): Display | undefined => {
	const d = project.data.display;
	return d && { alt: project.data.title, fit: d.fit, position: d.crop, zoom: d.zoom, effects: d.effects, asset: find(project, d.image, "display", "image") };
};

/* ---------- The write-up ---------- */

export interface Figure {
	id: string; // for the theater
	alt: string;
	caption?: string;
	asset: Asset;
	effects: boolean;
}
export type Block = { kind: "text"; html: string } | { kind: "figures"; figures: Figure[] };
export interface Section {
	heading?: string;
	blocks: Block[];
}

const FIGURE = /^!\[([^\]]*)\]\(\s*(\S+?)(?:\s+"([^"]*)")?\s*\)(\{effects=true\})?$/;
let markdown: Awaited<ReturnType<typeof createSatteriMarkdownProcessor>> | undefined;
const render = async (text: string) => {
	markdown ??= await createSatteriMarkdownProcessor();
	return listLabels(linkTooltips((await markdown.render(text)).code));
};

export async function writeUp(project: Project): Promise<Section[]> {
	const slug = project.id;
	let figureCount = 0;

	// Split at each ## heading, then each section into paragraphs (blocks between blank lines)
	const parts: { heading?: string; lines: string[] }[] = [{ lines: [] }];
	const body = (project.body ?? "").replace(/\r\n/g, "\n").replace(/<!--[\s\S]*?-->/g, "");
	for (const line of body.split("\n")) {
		const heading = line.match(/^##\s+(.+?)\s*#*\s*$/);
		if (heading) parts.push({ heading: heading[1], lines: [] });
		else parts.at(-1)!.lines.push(line);
	}

	const sections: Section[] = [];
	for (const part of parts) {
		const blocks: Block[] = [];
		let text: string[] = [];
		const flushText = async () => {
			if (text.length) blocks.push({ kind: "text", html: await render(text.join("\n\n")) });
			text = [];
		};
		for (const chunk of part.lines.join("\n").split(/\n\s*\n/)) {
			const lines = chunk.split("\n").filter((l) => l.trim());
			if (!lines.length) continue;
			const figures = lines.map((l) => l.trim().match(FIGURE));
			if (figures.every(Boolean)) {
				await flushText();
				if (figures.length > 3)
					throw new Error(`Project "${slug}": at most three figures side by side (found ${figures.length}).`);
				blocks.push({
					kind: "figures",
					figures: figures.map((m) => ({
						id: `fig-${++figureCount}`,
						alt: m![1] || m![3] || "", // without its own alt text, a figure is described by its caption
						caption: m![3],
						asset: find(project, m![2], "in the write-up", "visual"),
						effects: Boolean(m![4]),
					})),
				});
			} else if (lines.some((l) => /!\[[^\]]*\]\(/.test(l))) {
				throw new Error(
					`Project "${slug}": put each image on a line of its own, with a blank line between it and the text:\n  ${lines.join("\n  ")}`,
				);
			} else {
				text.push(lines.join("\n"));
			}
		}
		await flushText();
		if (part.heading || blocks.length) sections.push({ heading: part.heading, blocks });
	}
	return sections;
}

/* ---------- The Media section ---------- */

export type MediaItem = {
	id: string;
	title: string;
	caption?: string;
	wide: boolean;
	tab: string; // what it is, in the card's tab
} & (
	| { type: "image"; asset: Asset; alt: string; shape: "landscape" | "portrait"; fit: "crop" | "whole"; position: string; zoom: number; effects: boolean }
	| { type: "clip"; asset: Asset; shape: "landscape" | "portrait"; effects: boolean }
	| { type: "video"; asset: Asset; poster?: Asset; sound: boolean; effects: boolean }
	| { type: "slides"; slides: Asset[]; pdf?: Asset; effects: boolean }
	| { type: "link"; href?: string; live: boolean; address?: string }
);

export function media(project: Project): MediaItem[] {
	const slug = project.id;
	return (project.data.media ?? []).map((m, i): MediaItem => {
		const base = { id: `media-${i + 1}`, title: m.title, caption: m.caption, wide: m.wide };
		const where = `media: "${m.title}"`;
		switch (m.type) {
			case "image":
				return {
					...base,
					type: "image",
					tab: "Image",
					asset: find(project, m.file, where, "image"),
					alt: m.title, // screen readers hear the card's title
					shape: m.shape,
					fit: m.fit,
					position: m.crop,
					zoom: m.zoom,
					effects: m.effects,
				};
			case "clip":
				return { ...base, type: "clip", tab: "Clip", asset: find(project, m.file, where, "visual"), shape: m.shape, effects: m.effects };
			case "video":
				return {
					...base,
					type: "video",
					tab: "Video",
					asset: find(project, m.file, where, "video"),
					poster: m.thumbnail ? find(project, m.thumbnail, where, "image") : undefined,
					sound: m.sound,
					effects: m.effects,
				};
			case "slides": {
				const folder = keyOf(slug, m.folder).replace(/\/$/, "") + "/";
				const slides: Asset[] = Object.keys(images)
					.filter((k) => k.startsWith(folder) && !k.slice(folder.length).includes("/"))
					.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
					.map((k) => ({ kind: "image", image: images[k].default }));
				if (!slides.length) {
					if (!project.data.draft) throw new Error(`Project "${slug}": no slide images in ${m.folder} (${where}).`);
					slides.push({ kind: "missing", path: `${clean(m.folder).replace(/\/$/, "")}/slide-01.png` });
				}
				return {
					...base,
					type: "slides",
					tab: "Slides",
					slides,
					pdf: m.pdf ? find(project, m.pdf, where, "file") : undefined,
					effects: m.effects,
				};
			}
			case "link": {
				if (!m.href && !m.file)
					throw new Error(`Project "${slug}": the link "${m.title}" needs an href (a web address) or a file.`);
				const file = m.file ? find(project, m.file, where, "file") : undefined;
				return {
					...base,
					type: "link",
					tab: m.label ?? (m.live ? "Live" : m.file ? m.file.split(".").pop()!.toUpperCase() : "Link"),
					href: m.href ?? (file?.kind === "file" ? file.src : undefined),
					live: m.live,
					// A live site's address, beside its title: lander.example.dev/sim
					address: m.live && m.href ? m.href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "") : undefined,
				};
			}
		}
	});
}
