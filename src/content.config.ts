import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const projects = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
	schema: ({ image }) =>
		z.object({
			number: z.number().int().positive(), // mission number, also the display order
			title: z.string(),
			status: z.enum(["in-orbit", "launched", "decommissioned"]),
			summary: z.string(), // one sentence, shown on the card
			stack: z.array(z.string()),
			links: z
				.object({
					repo: z.url().optional(),
					demo: z.url().optional(), // live site; the card title prefers it over the repo
				})
				.optional(),
			draft: z.boolean().default(false), // true hides the project
			// The card's display screen: a real plot, screenshot, or photo from the project. Without one,
			// the card shows a "no signal" screen.
			display: z
				.object({
					image: image(), // e.g. ../../assets/projects/<slug>.png
					alt: z.string(),
					readout: z.string().optional(), // small label on the screen
					position: z.string().default("50% 50%"), // which part of the image survives the crop
					zoom: z.number().min(1).default(1), // magnify around that point, for busy images
				})
				.optional(),
		}),
});

export const collections = { projects };
