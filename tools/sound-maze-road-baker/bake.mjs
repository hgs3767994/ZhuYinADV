import { createRequire } from 'node:module';
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
const sharpModulePath = process.env.SHARP_MODULE_PATH;
if (!sharpModulePath) {
  throw new Error('Set SHARP_MODULE_PATH to an installed sharp package directory.');
}
const sharp = require(sharpModulePath);

const projectRoot = path.resolve(import.meta.dirname, '..', '..');
const sourceDirectory = path.join(projectRoot, 'public', 'assets', 'images', 'campaign', 'sound-maze');
const outputDirectory = path.join(sourceDirectory, 'road-tiles');
const geometry = [
  { fork: { x: 320, y: 2100 }, merge: { x: 320, y: 1830 }, walls: { left: { x: 175, y: 1945 }, right: { x: 465, y: 1945 } } },
  { fork: { x: 440, y: 1680 }, merge: { x: 440, y: 1410 }, walls: { left: { x: 295, y: 1525 }, right: { x: 585, y: 1525 } } },
  { fork: { x: 220, y: 1260 }, merge: { x: 220, y: 990 }, walls: { left: { x: 75, y: 1105 }, right: { x: 365, y: 1105 } } },
  { fork: { x: 420, y: 840 }, merge: { x: 420, y: 570 }, walls: { left: { x: 275, y: 685 }, right: { x: 565, y: 685 } } },
  { fork: { x: 300, y: 420 }, merge: { x: 300, y: 150 }, walls: { left: { x: 155, y: 265 }, right: { x: 445, y: 265 } } }
];
const exit = { x: 320, y: -50 };
const tileX = -100;
const tileWidth = 840;

function cubicCommand(segment) {
  return `C ${segment.controlA.x} ${segment.controlA.y}, ${segment.controlB.x} ${segment.controlB.y}, ${segment.end.x} ${segment.end.y}`;
}

function forkCurves(index, side) {
  const node = geometry[index];
  const wall = node.walls[side];
  return {
    front: {
      start: node.fork,
      controlA: { x: node.fork.x, y: node.fork.y - 88 },
      controlB: { x: wall.x, y: wall.y + 82 },
      end: wall
    },
    back: {
      start: wall,
      controlA: { x: wall.x, y: wall.y - 76 },
      controlB: { x: node.merge.x, y: node.merge.y + 88 },
      end: node.merge
    }
  };
}

function routePath(index, side) {
  const curves = forkCurves(index, side);
  return `M ${curves.front.start.x} ${curves.front.start.y} ${cubicCommand(curves.front)} ${cubicCommand(curves.back)}`;
}

function frontPath(index, side) {
  const curve = forkCurves(index, side).front;
  return `M ${curve.start.x} ${curve.start.y} ${cubicCommand(curve)}`;
}

function connectorPath(index) {
  const node = geometry[index];
  const destination = geometry[index + 1]?.fork ?? exit;
  const verticalGap = node.merge.y - destination.y;
  const tangentLength = Math.max(54, verticalGap * 0.42);
  return `M ${node.merge.x} ${node.merge.y} C ${node.merge.x} ${node.merge.y - tangentLength}, ${destination.x} ${destination.y + tangentLength}, ${destination.x} ${destination.y}`;
}

function incomingPath(index) {
  return index === 0
    ? 'M 320 2360 C 320 2270, 320 2180, 320 2100'
    : connectorPath(index - 1);
}

function destinationForkPaths(index) {
  const destinationIndex = index + 1;
  if (!geometry[destinationIndex]) return [];
  return [frontPath(destinationIndex, 'left'), frontPath(destinationIndex, 'right')];
}

function blockedPath(index, side) {
  const curves = forkCurves(index, side);
  const direction = side === 'left' ? -1 : 1;
  const wall = geometry[index].walls[side];
  return `M ${curves.front.start.x} ${curves.front.start.y} ${cubicCommand(curves.front)} C ${wall.x + direction * 6} ${wall.y - 78}, ${wall.x + direction * 58} ${wall.y - 165}, ${wall.x + direction * 72} ${wall.y - 230}`;
}

function strokeSvg({ paths, top, height, strokeWidth }) {
  const pathMarkup = paths.map((path) => {
    const d = typeof path === 'string' ? path : path.d;
    const capEnd = typeof path === 'string' ? true : path.capEnd !== false;
    const coordinates = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const endX = coordinates.at(-2);
    const endY = coordinates.at(-1);
    const endCap = !capEnd || endX === undefined || endY === undefined
      ? ''
      : `<circle cx="${endX}" cy="${endY}" r="${strokeWidth / 2}" fill="white" />`;
    return `<path d="${d}" fill="none" stroke="white" stroke-linecap="butt" stroke-linejoin="round" />${endCap}`;
  }).join('');
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${tileWidth}" height="${height}" viewBox="${tileX} ${top} ${tileWidth} ${height}">
      <g stroke-width="${strokeWidth}">${pathMarkup}</g>
    </svg>`;
}

async function makeMask(paths, top, height, strokeWidth, mode, opacity) {
  let pipeline = sharp(Buffer.from(strokeSvg({ paths, top, height, strokeWidth })))
    .ensureAlpha()
    .extractChannel('alpha');
  if (mode === 'clearing') {
    pipeline = pipeline.blur(8);
  } else {
    pipeline = pipeline.blur(5.5).threshold(101).blur(0.65);
  }
  if (opacity !== 1) pipeline = pipeline.linear(opacity);
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  if (info.width !== tileWidth || info.height !== height || info.channels !== 1) {
    throw new Error(`Unexpected mask shape: ${info.width}x${info.height}x${info.channels}`);
  }
  return data;
}

const patternCache = new Map();

function patternPixels(texture, x, width, top, height) {
  const cacheKey = `${texture.id}:${x}:${width}:${top}:${height}`;
  const cached = patternCache.get(cacheKey);
  if (cached) return cached;
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    const sourceY = ((top + y) % texture.height + texture.height) % texture.height;
    for (let offsetX = 0; offsetX < width; offsetX += 1) {
      const sourceX = ((x + offsetX) % texture.width + texture.width) % texture.width;
      const sourceOffset = (sourceY * texture.width + sourceX) * texture.channels;
      const targetOffset = (y * width + offsetX) * 3;
      pixels[targetOffset] = texture.data[sourceOffset];
      pixels[targetOffset + 1] = texture.data[sourceOffset + 1];
      pixels[targetOffset + 2] = texture.data[sourceOffset + 2];
    }
  }
  patternCache.set(cacheKey, pixels);
  return pixels;
}

async function makeLayer(texture, mask, top, height) {
  const pixels = patternPixels(texture, tileX, tileWidth, top, height);
  const rgba = Buffer.alloc(tileWidth * height * 4);
  for (let pixel = 0; pixel < tileWidth * height; pixel += 1) {
    const alpha = mask[pixel];
    if (alpha > 0) {
      rgba[pixel * 4] = pixels[pixel * 3];
      rgba[pixel * 4 + 1] = pixels[pixel * 3 + 1];
      rgba[pixel * 4 + 2] = pixels[pixel * 3 + 2];
    }
    rgba[pixel * 4 + 3] = alpha;
  }
  return sharp(rgba, { raw: { width: tileWidth, height, channels: 4 } })
    .png()
    .toBuffer();
}

function flattenVisiblePixelsOntoForest(roadPixels, forestPixels) {
  const flattened = Buffer.alloc(roadPixels.length);
  for (let pixel = 0; pixel < roadPixels.length / 4; pixel += 1) {
    const rgbaOffset = pixel * 4;
    const rgbOffset = pixel * 3;
    const alphaByte = roadPixels[rgbaOffset + 3];
    if (alphaByte === 0) continue;

    const alpha = alphaByte / 255;
    const inverseAlpha = 1 - alpha;
    flattened[rgbaOffset] = Math.round(
      roadPixels[rgbaOffset] * alpha + forestPixels[rgbOffset] * inverseAlpha
    );
    flattened[rgbaOffset + 1] = Math.round(
      roadPixels[rgbaOffset + 1] * alpha + forestPixels[rgbOffset + 1] * inverseAlpha
    );
    flattened[rgbaOffset + 2] = Math.round(
      roadPixels[rgbaOffset + 2] * alpha + forestPixels[rgbOffset + 2] * inverseAlpha
    );
    flattened[rgbaOffset + 3] = 255;
  }
  return flattened;
}

async function bake(name, paths, top, bottom, textures) {
  const height = bottom - top;
  const clearingMask = await makeMask(paths, top, height, 130, 'clearing', 0.38);
  const shoulderMask = await makeMask(paths, top, height, 86, 'union', 0.68);
  const fillMask = await makeMask(paths, top, height, 62, 'union', 1);
  const clearingLayer = await makeLayer(textures.clearingTexture, clearingMask, top, height);
  const shoulderLayer = await makeLayer(textures.clearingTexture, shoulderMask, top, height);
  const fillLayer = await makeLayer(textures.roadTexture, fillMask, top, height);
  const { data: roadPixels, info } = await sharp({
    create: { width: tileWidth, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
    .composite([{ input: clearingLayer }, { input: shoulderLayer }, { input: fillLayer }])
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.width !== tileWidth || info.height !== height || info.channels !== 4) {
    throw new Error(`Unexpected road tile shape: ${info.width}x${info.height}x${info.channels}`);
  }
  const forestPixels = patternPixels(textures.forestTexture, tileX, tileWidth, top, height);
  const flattened = flattenVisiblePixelsOntoForest(roadPixels, forestPixels);
  await sharp(flattened, { raw: { width: tileWidth, height, channels: 4 } })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(outputDirectory, `${name}.png`));
}

await mkdir(outputDirectory, { recursive: true });
const loadTexture = async (id, filename, size = 512) => {
  const { data, info } = await sharp(await readFile(path.join(sourceDirectory, filename)))
    .resize(size, size)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { id, data, channels: info.channels, width: size, height: size };
};
const roadTexture = await loadTexture('road', 'level-02-road-texture.webp');
const clearingTexture = await loadTexture('clearing', 'level-02-road-clearing-texture.webp');
// CSS repeats this background at 768px and offsets it by one complete tile,
// so sampling with world coordinates here matches the stage pixel-for-pixel.
const forestTexture = await loadTexture('forest', 'level-02-forest-ground.webp', 768);
const textures = { roadTexture, clearingTexture, forestTexture };

for (let index = 0; index < geometry.length; index += 1) {
  const destination = geometry[index + 1]?.fork ?? exit;
  const destinationNode = geometry[index + 1];
  const standardTop = destinationNode
    ? destinationNode.walls.left.y - 120
    : destination.y - 120;
  const bottom = index === 0 ? 2440 : geometry[index].fork.y + 240;
  const incoming = incomingPath(index);
  const connector = connectorPath(index);
  const destinationFork = destinationForkPaths(index);
  const variants = {
    waiting: [{ d: incoming, capEnd: false }, frontPath(index, 'left'), frontPath(index, 'right')],
    'left-correct': [
      { d: routePath(index, 'left'), capEnd: false },
      { d: incoming, capEnd: false },
      { d: connector, capEnd: destinationFork.length === 0 },
      ...destinationFork
    ],
    'right-correct': [
      { d: routePath(index, 'right'), capEnd: false },
      { d: incoming, capEnd: false },
      { d: connector, capEnd: destinationFork.length === 0 },
      ...destinationFork
    ],
    'left-blocked': [{ d: incoming, capEnd: false }, blockedPath(index, 'left')],
    'right-blocked': [{ d: incoming, capEnd: false }, blockedPath(index, 'right')]
  };
  for (const [variant, paths] of Object.entries(variants)) {
    await bake(`node-${index + 1}-${variant}`, paths, standardTop, bottom, textures);
  }
}

console.log(`Baked sound-maze road tiles to ${outputDirectory}`);
