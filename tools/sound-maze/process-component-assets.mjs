import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(toolDir, '..', '..');
const outputDir = path.join(projectRoot, 'artifacts', 'sound-maze');

const generatedRoot = 'C:/Users/jp619/.codex/generated_images/01a1127a-478f-7003-9b79-67abd14bf9ed';

const inputs = {
  road: path.join(generatedRoot, 'exec-98942911-2dff-4b14-aa96-45c5ae6eaff3.png'),
  stele: path.join(generatedRoot, 'exec-87617ebb-7d7a-46f0-9132-81daf845d206.png'),
  fence: path.join(generatedRoot, 'exec-402d5db5-0111-4774-a1e5-02129e853d94.png'),
  sign: path.join(generatedRoot, 'exec-84213e8d-2017-4b5f-981e-7d244c099c59.png'),
  rocks: path.join(generatedRoot, 'exec-057825d6-59d4-4f9d-8027-b699cd78b6c1.png'),
  arch: path.join(generatedRoot, 'exec-157e8103-6efb-4e02-9a4c-b8a22a4f3be1.png'),
  mist: path.join(generatedRoot, 'exec-fe23d7b6-8b80-4e0c-9ae4-218e34a6c1a8.png'),
};

const components = [
  { key: 'stele', file: 'level-02-landmark-01-stele-v01.png', width: 144, height: 136 },
  { key: 'fence', file: 'level-02-landmark-02-fence-v01.png', width: 180, height: 140 },
  { key: 'sign', file: 'level-02-landmark-03-sign-v01.png', width: 164, height: 200 },
  { key: 'rocks', file: 'level-02-landmark-04-rocks-v01.png', width: 200, height: 160 },
  { key: 'arch', file: 'level-02-landmark-05-arch-v01.png', width: 188, height: 216 },
  { key: 'mist', file: 'level-02-magic-mist-wall-v01.png', width: 192, height: 144 },
];

async function makeSeamlessRoadTexture() {
  const quarter = await sharp(inputs.road)
    .resize(512, 512, { fit: 'cover', position: 'centre' })
    .modulate({ brightness: 0.94, saturation: 0.9 })
    .png()
    .toBuffer();
  const right = await sharp(quarter).flop().png().toBuffer();
  const bottom = await sharp(quarter).flip().png().toBuffer();
  const corner = await sharp(quarter).flip().flop().png().toBuffer();

  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#00000000' } })
    .composite([
      { input: quarter, left: 0, top: 0 },
      { input: right, left: 512, top: 0 },
      { input: bottom, left: 0, top: 512 },
      { input: corner, left: 512, top: 512 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join(outputDir, 'level-02-road-texture-v01.png'));

  await sharp(path.join(outputDir, 'level-02-road-texture-v01.png'))
    .webp({ quality: 90, effort: 6 })
    .toFile(path.join(outputDir, 'level-02-road-texture-v01.webp'));
}

async function normalizeComponent({ key, file, width, height }) {
  const padding = 8;
  const prepared = await sharp(inputs[key])
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 6 })
    .resize(width - padding * 2, height - padding * 2, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3,
    })
    .png()
    .toBuffer();

  await sharp(prepared).extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join(outputDir, file));
}

function labelSvg(width, height, text, size = 25) {
  const safe = text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <text x="${width / 2}" y="${height - 10}" text-anchor="middle" font-family="Noto Sans TC, Microsoft JhengHei, sans-serif" font-size="${size}" font-weight="700" fill="#fff6db" stroke="#284d42" stroke-width="5" paint-order="stroke">${safe}</text>
  </svg>`);
}

async function makeRoadPreview() {
  const tile = path.join(outputDir, 'level-02-road-texture-v01.png');
  const composites = [];
  for (let y = 0; y < 3; y += 1) {
    for (let x = 0; x < 3; x += 1) {
      const previewTile = await sharp(tile).resize(256, 256).png().toBuffer();
      composites.push({ input: previewTile, left: x * 256, top: y * 256 });
    }
  }
  await sharp({ create: { width: 768, height: 768, channels: 4, background: '#00000000' } })
    .composite(composites)
    .resize(680, 680)
    .png()
    .toFile(path.join(outputDir, 'level-02-road-texture-tile-check-v01.png'));
}

async function makeContactSheet() {
  const width = 780;
  const height = 2020;
  const base = sharp({ create: { width, height, channels: 4, background: '#e9f2dd' } });
  const panels = [
    { x: 40, y: 130, w: 700, h: 455, color: '#477463' },
    { x: 40, y: 620, w: 335, h: 410, color: '#356554' },
    { x: 405, y: 620, w: 335, h: 410, color: '#356554' },
    { x: 40, y: 1060, w: 335, h: 410, color: '#356554' },
    { x: 405, y: 1060, w: 335, h: 410, color: '#356554' },
    { x: 40, y: 1500, w: 335, h: 450, color: '#356554' },
    { x: 405, y: 1500, w: 335, h: 450, color: '#356554' },
  ];
  const overlays = panels.map(({ x, y, w, h, color }) => ({
    input: Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="${w - 4}" height="${h - 4}" rx="36" fill="${color}" stroke="#f2be67" stroke-width="4"/></svg>`),
    left: x,
    top: y,
  }));

  const texture = await sharp(path.join(outputDir, 'level-02-road-texture-tile-check-v01.png'))
    .resize(640, 350, { fit: 'cover' })
    .png()
    .toBuffer();
  overlays.push({ input: texture, left: 70, top: 175 });
  overlays.push({ input: labelSvg(700, 60, '道路材質・3 × 3 平鋪檢查'), left: 40, top: 520 });

  const slots = [
    { file: 'level-02-landmark-01-stele-v01.png', centerX: 207, y: 700, scale: 1.45, panelX: 40, labelY: 960, label: '地標 1・王國石碑' },
    { file: 'level-02-landmark-02-fence-v01.png', centerX: 572, y: 710, scale: 1.3, panelX: 405, labelY: 960, label: '地標 2・灌木木柵' },
    { file: 'level-02-landmark-03-sign-v01.png', centerX: 207, y: 1115, scale: 1.25, panelX: 40, labelY: 1400, label: '地標 3・傾斜路標' },
    { file: 'level-02-landmark-04-rocks-v01.png', centerX: 572, y: 1140, scale: 1.25, panelX: 405, labelY: 1400, label: '地標 4・蕨類岩石' },
    { file: 'level-02-landmark-05-arch-v01.png', centerX: 207, y: 1550, scale: 1.2, panelX: 40, labelY: 1880, label: '地標 5・破損小拱門' },
    { file: 'level-02-magic-mist-wall-v01.png', centerX: 572, y: 1610, scale: 1.35, panelX: 405, labelY: 1880, label: '動態元件・魔法紫霧牆' },
  ];
  for (const slot of slots) {
    const source = sharp(path.join(outputDir, slot.file));
    const meta = await source.metadata();
    const rendered = await source.resize(Math.round(meta.width * slot.scale), Math.round(meta.height * slot.scale)).png().toBuffer();
    overlays.push({ input: rendered, left: slot.centerX - Math.round((meta.width * slot.scale) / 2), top: slot.y });
    overlays.push({ input: labelSvg(335, 60, slot.label, 22), left: slot.panelX, top: slot.labelY });
  }
  overlays.push({ input: labelSvg(width, 90, '聲音迷宮・透明道路與獨立元件 v01', 34), left: 0, top: 15 });

  await base.composite(overlays).png({ compressionLevel: 9 }).toFile(path.join(outputDir, 'level-02-components-contact-sheet-v01.png'));
}

await fs.mkdir(outputDir, { recursive: true });
await makeSeamlessRoadTexture();
for (const component of components) await normalizeComponent(component);
await makeRoadPreview();
await makeContactSheet();

for (const file of [
  'level-02-road-texture-v01.png',
  'level-02-road-texture-v01.webp',
  ...components.map(({ file }) => file),
  'level-02-road-texture-tile-check-v01.png',
  'level-02-components-contact-sheet-v01.png',
]) {
  const metadata = await sharp(path.join(outputDir, file)).metadata();
  console.log(`${file}: ${metadata.width}x${metadata.height}, alpha=${Boolean(metadata.hasAlpha)}`);
}
