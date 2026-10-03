import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.dirname(fileURLToPath(import.meta.url));
const splitRoot = path.join(root, 'split');

for (let index = 1; index <= 5; index += 1) {
  const id = String(index).padStart(2, '0');

  for (const side of ['left', 'right']) {
    const file = path.join(splitRoot, `eye-${id}-${side}.svg`);
    const source = await fs.readFile(file, 'utf8');
    if (/<image\b|\bbase64\b|<script\b/i.test(source)) {
      throw new Error(`${path.basename(file)} is not a self-contained vector asset`);
    }

    const { data, info } = await sharp(Buffer.from(source))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let forbiddenPixels = 0;
    let visiblePixels = 0;

    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        const alpha = data[(y * info.width + x) * info.channels + 3];
        if (alpha === 0) continue;
        visiblePixels += 1;
        const isForbidden = side === 'left' ? x >= 256 : x < 256;
        if (isForbidden) forbiddenPixels += 1;
      }
    }

    if (visiblePixels === 0 || forbiddenPixels !== 0) {
      throw new Error(`${path.basename(file)} isolation failed: ${visiblePixels} visible, ${forbiddenPixels} on the opposite side`);
    }
  }
}

console.log('Verified 10 isolated, self-contained vector eye assets.');
