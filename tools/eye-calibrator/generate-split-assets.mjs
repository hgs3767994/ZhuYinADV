import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const outputRoot = path.join(root, 'split');
await fs.mkdir(outputRoot, { recursive: true });

for (let index = 1; index <= 5; index += 1) {
  const id = String(index).padStart(2, '0');
  const source = await fs.readFile(path.join(root, `eye-${id}.svg`), 'utf8');
  for (const side of ['left', 'right']) {
    const rect = side === 'left'
      ? '<rect x="0" y="0" width="256" height="512"/>'
      : '<rect x="256" y="0" width="256" height="512"/>';
    const clip = `<defs><clipPath id="isolated-eye-half" clipPathUnits="userSpaceOnUse">${rect}</clipPath></defs>`;
    const split = source
      .replace(/(<title>[\s\S]*?<\/title>)/, `$1\n  ${clip}`)
      .replace('<g id="eyes"', '<g id="eyes" clip-path="url(#isolated-eye-half)"');
    if (split === source || !split.includes('isolated-eye-half')) {
      throw new Error(`Unable to isolate ${side} eye for eye-${id}.svg`);
    }
    await fs.writeFile(path.join(outputRoot, `eye-${id}-${side}.svg`), split, 'utf8');
  }
}
