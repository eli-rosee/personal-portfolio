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
export const getProjects = async () =>
	(await getCollection("projects", ({ data }) => import.meta.env.DEV || !data.draft)).sort(
		(a, b) => a.data.number - b.data.number,
	);
