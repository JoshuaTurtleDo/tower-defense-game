import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pngToIco from "png-to-ico";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const inputPath = path.join(projectRoot, "assets", "stonewatch-keep.png");
const outputPath = path.join(projectRoot, "assets", "stonewatch-keep.ico");

await mkdir(path.dirname(outputPath), { recursive: true });
const png = await readFile(inputPath);
const ico = await pngToIco(png);
await writeFile(outputPath, ico);
console.log(`Created ${outputPath}`);
