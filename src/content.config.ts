import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import type { Loader } from "astro/loaders";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import yaml from "js-yaml";

// Reads each project's index.md: the fields, and the write-up as plain Markdown. Astro's own loader would
// also render the write-up, resolving its images; src/scripts/project-files.ts does that instead, so a
// draft's missing file is a labeled gap and a published one gets a clear error.
const projectFolders = (base: string): Loader => ({
	name: "project-folders",
	load: async ({ store, parseData, generateDigest, watcher, logger }) => {
		const sync = async () => {
			store.clear();
			for (const dir of readdirSync(base, { withFileTypes: true })) {
				const file = join(base, dir.name, "index.md");
				if (!dir.isDirectory() || !existsSync(file)) continue;
				const text = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
				const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
				if (!match) {
					logger.error(`${file}: the fields need a --- line above and below them`);
					continue;
				}
				const data = await parseData({ id: dir.name, data: (yaml.load(match[1]) ?? {}) as Record<string, unknown>, filePath: file });
				store.set({ id: dir.name, data, body: match[2], filePath: file, digest: generateDigest(text) });
			}
		};
		await sync();
		// While developing, any change in the projects folder reloads them
		const root = resolve(base);
		const changed = (path: string) => path.startsWith(root) && sync();
		watcher?.on("change", changed);
		watcher?.on("add", changed);
		watcher?.on("unlink", changed);
	},
});

/*
 * Projects: one folder each, src/content/projects/<slug>/index.md, with the project's images, clips and
 * files in its assets/ folder. The slug is the page's address (/projects/<slug>/). `npm run new-project "Title"`
 * makes the folder with every field below written out and explained. File paths are relative to the
 * assets folder ("plot.png", "slides/"); a missing file stops the build with its name.
 */

// A file in the project's assets/ folder (an image, video, GIF or PDF), found when the page is built
// (src/scripts/project-files.ts). In a draft a missing file shows as a labeled gap; once published, it
// stops the build.
const file = z.string().min(1);

// Fields every media card has: the card's title and the grey line under it; `wide` spans both columns
const card = { title: z.string(), caption: z.string().optional(), wide: z.boolean().default(false) };

// How an image fills its screen: `crop` fills it (cut to fit, `crop` and `zoom` choose what stays), `whole`
// shows all of it with dark bars where the shapes differ
const fit = z.enum(["crop", "whole"]).default("crop");
const crop = z.string().default("center"); // the part kept in view: center, top, bottom, left, right, "top left", "30% 70%"
const zoom = z.number().min(1).default(1); // 1.5 = 150%, zoomed in around the crop point
// The screen's grade and glass (glare, scanlines, dark rim): on for the display, off for media cards unless asked for
const effects = z.boolean().default(false);

const projects = defineCollection({
	loader: projectFolders("./src/content/projects"),
	schema: () =>
		z.object({
			number: z.number().int().positive(), // mission number, also the display order
			title: z.string(),
			status: z.enum(["in-orbit", "liftoff", "decommissioned"]),
			summary: z.string(), // one or two sentences: the card and the top of the page
			stack: z.array(z.string()),
			repo: z.url().optional(), // the Repo button
			private: z.string().optional(), // no public code: a "Code on request" button (emails me); this is its tooltip
			draft: z.boolean().default(false), // true hides the project from the built site
			// The display screen on the card and at the top of the page. Without one, "no signal".
			display: z
				.object({
					image: file,
					fit,
					crop,
					zoom,
					effects: effects.default(true),
				})
				.optional(),
			// The readouts under the top card, like the footer's telemetry (up to four)
			readouts: z
				.array(z.object({ label: z.string(), value: z.string(), note: z.string().optional() }))
				.max(4)
				.optional(),
			// The line that opens About; a *phrase* in asterisks is amber
			statement: z.string().optional(),
			// The Media section's cards, in order
			media: z
				.array(
					z.discriminatedUnion("type", [
						z.object({
							type: z.literal("image"),
							file,
							shape: z.enum(["landscape", "portrait"]).default("landscape"), // portrait: one column, two rows tall
							fit,
							crop,
							zoom,
							effects,
							...card,
						}),
						// a silent loop: .mp4, .webm or .gif; portrait: one column, two rows tall
						z.object({ type: z.literal("clip"), file, shape: z.enum(["landscape", "portrait"]).default("landscape"), effects, ...card }),
						// with sound; sound: false drops "Sound on" from the card's corner (the length stays)
						z.object({ type: z.literal("video"), file, thumbnail: file.optional(), sound: z.boolean().default(true), effects, ...card }),
						// a folder of slide images, in file-name order, and the deck as a PDF to download
						z.object({ type: z.literal("slides"), folder: file, pdf: file.optional(), effects, ...card }),
						// a web page (href) or a file (a PDF report): a bar under the cards that opens a new tab;
						// live: the project running somewhere, first, with a green Live light and its own button
						z.object({
							type: z.literal("link"),
							href: z.url().optional(),
							file: file.optional(),
							live: z.boolean().default(false),
							label: z.string().optional(), // the bar's tag: "PDF", "Paper"
							...card,
						}),
					]),
				)
				.optional(),
		}),
});

// The climbing clip on the About card (one entry, src/content/clip.md)
const clip = defineCollection({
	loader: glob({ pattern: "clip.md", base: "./src/content" }),
	schema: z.object({
		src: z.string(), // the video, under public/
		poster: z.string().optional(),
		label: z.string(), // describes the clip for screen readers
		cam: z.string().optional(), // label on the viewport glass
		sent: z.boolean().default(false), // shows the green SENT tab
		sentNote: z.string().optional(), // the SENT tab's tooltip
		title: z.string(),
		summary: z.string().optional(),
		tags: z.array(z.string()).optional(),
	}),
});

export const collections = { projects, clip };
