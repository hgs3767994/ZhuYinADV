import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(toolDir, '..', '..');
const artifactDir = path.join(projectRoot, 'artifacts', 'sound-maze');
const publicDir = path.join(projectRoot, 'public', 'assets', 'images', 'campaign', 'sound-maze');
const generatedRoot = 'C:/Users/jp619/.codex/generated_images/01a1127a-478f-7003-9b79-67abd14bf9ed';

const forestGroundSource = path.join(generatedRoot, 'exec-53e22ded-908b-470b-a7ea-aff9ad8713c2.png');
const forestBankSource = path.join(generatedRoot, 'exec-71ba3114-6d00-4d12-9bc6-464f11f6a875.png');
const clearingSource = path.join(generatedRoot, 'exec-d5a49ce8-db2d-4035-86d3-2dd14de10145.png');

const groundQuarter = await sharp(forestGroundSource)
  .resize(768, 768, { fit: 'cover', position: 'centre' })
  .modulate({ brightness: 0.84, saturation: 0.88 })
  .webp({ quality: 90, effort: 6 })
  .toBuffer();
const groundRight = await sharp(groundQuarter).flop().webp({ quality: 90, effort: 6 }).toBuffer();
const groundBottom = await sharp(groundQuarter).flip().webp({ quality: 90, effort: 6 }).toBuffer();
const groundCorner = await sharp(groundQuarter).flip().flop().webp({ quality: 90, effort: 6 }).toBuffer();
const forestGroundPath = path.join(artifactDir, 'level-02-forest-ground-overscan-v01.webp');

await sharp({ create: { width: 1536, height: 1536, channels: 3, background: '#244f42' } })
  .composite([
    { input: groundQuarter, left: 0, top: 0 },
    { input: groundRight, left: 768, top: 0 },
    { input: groundBottom, left: 0, top: 768 },
    { input: groundCorner, left: 768, top: 768 },
  ])
  .webp({ quality: 88, effort: 6 })
  .toFile(forestGroundPath);

const forestBankPath = path.join(artifactDir, 'level-02-forest-bank-left-v01.png');
await sharp(forestBankSource)
  .resize(512, 768, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
  .modulate({ brightness: 0.9, saturation: 0.9 })
  .png({ compressionLevel: 9 })
  .toFile(forestBankPath);
const forestBankWebpPath = path.join(artifactDir, 'level-02-forest-bank-left-v01.webp');
await sharp(forestBankPath)
  .webp({ quality: 90, alphaQuality: 100, effort: 6 })
  .toFile(forestBankWebpPath);

await sharp(forestGroundPath)
  .toFile(path.join(publicDir, 'level-02-forest-ground.webp'));
await sharp(forestBankWebpPath)
  .toFile(path.join(publicDir, 'level-02-forest-bank-left.webp'));

const clearingQuarter = await sharp(clearingSource)
  .resize(512, 512, { fit: 'cover', position: 'centre' })
  .modulate({ brightness: 0.82, saturation: 0.78 })
  .webp({ quality: 90, effort: 6 })
  .toBuffer();
const clearingRight = await sharp(clearingQuarter).flop().webp({ quality: 90, effort: 6 }).toBuffer();
const clearingBottom = await sharp(clearingQuarter).flip().webp({ quality: 90, effort: 6 }).toBuffer();
const clearingCorner = await sharp(clearingQuarter).flip().flop().webp({ quality: 90, effort: 6 }).toBuffer();
const clearingPath = path.join(artifactDir, 'level-02-road-clearing-texture-v01.webp');
await sharp({ create: { width: 1024, height: 1024, channels: 3, background: '#77784d' } })
  .composite([
    { input: clearingQuarter, left: 0, top: 0 },
    { input: clearingRight, left: 512, top: 0 },
    { input: clearingBottom, left: 0, top: 512 },
    { input: clearingCorner, left: 512, top: 512 },
  ])
  .webp({ quality: 88, effort: 6 })
  .toFile(clearingPath);
await sharp(clearingPath)
  .toFile(path.join(publicDir, 'level-02-road-clearing-texture.webp'));

for (const file of [forestGroundPath, forestBankPath, forestBankWebpPath, clearingPath]) {
  const metadata = await sharp(file).metadata();
  const stats = await sharp(file).stats();
  const alpha = stats.channels[3];
  console.log(`${path.basename(file)}: ${metadata.width}x${metadata.height}, alpha=${Boolean(metadata.hasAlpha)}${alpha ? `, alphaRange=${alpha.min}-${alpha.max}` : ''}`);
}
