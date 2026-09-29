import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const projects = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
	schema: ({ image }) =>
		z.object({
			number: z.number().int().positive(), // mission number, also the display order
			title: z.string(),
			status: z.enum(["in-orbit", "liftoff", "decommissioned"]),
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
