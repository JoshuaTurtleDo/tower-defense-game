import { cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const destination = join(root, "ios", "StonewatchKeep", "Web");

await rm(destination, { recursive: true, force: true });
await mkdir(join(destination, "assets"), { recursive: true });
await mkdir(join(destination, "js", "game"), { recursive: true });
await mkdir(join(destination, "node_modules", "three", "build"), { recursive: true });

for (const file of ["index.html", "styles.css", "graphics3d.js"]) {
  await cp(join(root, file), join(destination, file));
}
await cp(join(root, "assets", "stonewatch-keep.png"), join(destination, "assets", "stonewatch-keep.png"));
await cp(join(root, "js", "game"), join(destination, "js", "game"), { recursive: true });
await cp(
  join(root, "node_modules", "three", "build", "three.min.js"),
  join(destination, "node_modules", "three", "build", "three.min.js")
);

console.log("Synced the iOS web bundle.");
