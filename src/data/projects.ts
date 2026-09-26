import { getCollection, type CollectionEntry } from "astro:content";

type Project = CollectionEntry<"projects">;

// Published projects in mission order
export const getProjects = async () =>
	(await getCollection("projects", ({ data }) => !data.draft)).sort(
		(a, b) => a.data.number - b.data.number,
	);

// Opt-in: only projects with a Markdown body get a page at /projects/<slug>/
export const hasPage = (project: Project) => Boolean(project.body?.trim());

export const pageUrl = (project: Project) => `/projects/${project.id}/`;
