import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// A video file in public/videos/ (gitignored, mounted at deploy like the resume)
const video = z.object({
	src: z.string(), // e.g. /videos/f1-highlight.mp4
	poster: z.string().optional(), // still frame shown before it plays
	caption: z.string().optional(),
});

const projects = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
	schema: ({ image }) =>
		z.object({
			number: z.number().int().positive(), // mission number, also the display order
			title: z.string(),
			status: z.enum(["in-orbit", "launched", "decommissioned"]),
			summary: z.string(), // one sentence, shown on the card and the project page
			stack: z.array(z.string()),
			links: z
				.object({
					repo: z.url().optional(),
					demo: z.url().optional(), // live site: the filled button on the project page
				})
				.optional(),
			draft: z.boolean().default(false), // true hides the project

			// Project page only. A project gets a page when its Markdown body (the Overview) isn't empty.
			private: z.boolean().default(false), // private repo: "Request code by email" button
			recognition: z
				.array(z.object({ title: z.string(), detail: z.string().optional() }))
				.optional(),
			role: z
				.object({
					solo: z.boolean().default(false), // "My part" instead of "My role"
					context: z.string(), // one label line, e.g. "Team of 6 · Two semesters"
					points: z.array(z.string()),
				})
				.optional(),
			demo: video
				.extend({ presentation: z.url().optional() }) // full recording (unlisted YouTube), linked from the caption
				.optional(),
			slides: z
				.object({
					images: z.array(z.object({ src: image(), alt: z.string() })),
					pdf: z.string().optional(), // full deck in public/slides/ (gitignored, mounted at deploy)
				})
				.optional(),
			// Sections for a project in several parts, each with an optional silent looping clip
			parts: z
				.array(z.object({ title: z.string(), text: z.string(), loop: video.optional() }))
				.optional(),
		}),
});

export const collections = { projects };
