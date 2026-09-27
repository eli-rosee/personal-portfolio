import { getCollection } from "astro:content";

// Published projects in mission order
export const getProjects = async () =>
	(await getCollection("projects", ({ data }) => !data.draft)).sort(
		(a, b) => a.data.number - b.data.number,
	);

