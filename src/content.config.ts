import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const projects = defineCollection({
	loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
	schema: z.object({
		number: z.number().int().positive(), // mission number, also the display order
		title: z.string(),
		status: z.enum(["in-orbit", "launched", "decommissioned"]),
		summary: z.string(), // one sentence, shown on the card
		stack: z.array(z.string()),
		links: z
			.object({
				repo: z.url().optional(),
				demo: z.url().optional(),
			})
			.optional(),
		draft: z.boolean().default(false), // true hides the project
	}),
});

export const collections = { projects };
