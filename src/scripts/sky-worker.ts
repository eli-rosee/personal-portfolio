// The starfield's sky (sky.ts), drawn off the page's thread on the canvas the page hands over
import { sky, type Sky } from "./sky";

let stars: Sky | undefined;

onmessage = ({ data }: MessageEvent) => {
	if (data.canvas) stars = sky((data.canvas as OffscreenCanvas).getContext("2d")!, data.color);
	if (data.size) stars?.size(...(data.size as [number, number, number]));
	if ("run" in data) stars?.run(data.run);
};
