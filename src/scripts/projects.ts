/*
 * Project helpers shared by the home page's cards and the project pages.
 */
import { getCollection } from "astro:content";

// Each status's light color, and its plain-English meaning for the tooltip
export const STATUS = {
	liftoff: { tone: "accent", tip: "In active development" },
	"in-orbit": { tone: "status", tip: "Completed" },
	decommissioned: { tone: "muted", tip: "No longer maintained" },
} as const;

// The projects on the site, in mission order. Drafts show while developing (`npm run dev`) so a
// project can be previewed as it's written, and never in the built site.
// Two published projects with one number would share a place in the order (and their cards' tooltip
// ids), so that stops the build, naming both. A draft is let off, like its missing files.
export const getProjects = async () => {
	const projects = (await getCollection("projects", ({ data }) => import.meta.env.DEV || !data.draft)).sort(
		(a, b) => a.data.number - b.data.number,
	);
	projects.forEach((p, i) => {
		const prev = projects[i - 1];
		if (prev?.data.number === p.data.number && !prev.data.draft && !p.data.draft)
			throw new Error(`Projects "${prev.id}" and "${p.id}" are both number ${p.data.number}; give each its own.`);
	});
	return projects;
};
