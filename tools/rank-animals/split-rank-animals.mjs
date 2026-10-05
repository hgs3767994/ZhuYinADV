import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const sourcePath = process.argv[2];
const outputDirectory = process.argv[3];

if (!sourcePath || !outputDirectory) {
  throw new Error('用法：node split-rank-animals.mjs <來源 JPG> <輸出目錄>');
}

const animals = [
  ['chicken', '小雞'],
  ['rabbit', '兔子'],
  ['chipmunk', '花栗鼠'],
  ['raccoon', '浣熊'],
  ['deer', '鹿'],
  ['sheep', '綿羊'],
  ['zebra', '斑馬'],
  ['hippo', '河馬'],
  ['giraffe', '長頸鹿'],
  ['elephant', '大象']
];

const { data, info } = await sharp(sourcePath)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

if (info.width < 1_000 || info.height < 500 || info.channels !== 3) {
  throw new Error(`來源圖尺寸或色彩格式不符：${info.width}x${info.height}x${info.channels}`);
}

await mkdir(outputDirectory, { recursive: true });

const cellHeight = info.height / 2;
const outputSize = 256;
const outputPadding = 16;
const maximumReachDistance = 170;
const transparentDistance = 7;
const opaqueDistance = 150;

function whiteDistance(red, green, blue) {
  return Math.hypot(255 - red, 255 - green, 255 - blue);
}

function makeTransparentRegion(left, top, width, height) {
  const pixelCount = width * height;
  const reachable = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;

  const canReach = (index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    const sourceIndex = ((top + y) * info.width + left + x) * 3;
    return whiteDistance(data[sourceIndex], data[sourceIndex + 1], data[sourceIndex + 2]) <
      maximumReachDistance;
  };
  const enqueue = (index) => {
    if (reachable[index] || !canReach(index)) return;
    reachable[index] = 1;
    queue[tail++] = index;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (head < tail) {
    const index = queue[head++];
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (y > 0) enqueue(index - width);
    if (y + 1 < height) enqueue(index + width);
  }

  const rgba = Buffer.alloc(pixelCount * 4);
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const sourceIndex = ((top + y) * info.width + left + x) * 3;
      const outputIndex = index * 4;
      const red = data[sourceIndex];
      const green = data[sourceIndex + 1];
      const blue = data[sourceIndex + 2];
      let alpha = 255;

      if (reachable[index]) {
        const distance = whiteDistance(red, green, blue);
        alpha = Math.round(
          Math.max(0, Math.min(1, (distance - transparentDistance) /
            (opaqueDistance - transparentDistance))) * 255
        );
      }

      if (alpha <= 4) {
        rgba[outputIndex] = 0;
        rgba[outputIndex + 1] = 0;
        rgba[outputIndex + 2] = 0;
        rgba[outputIndex + 3] = 0;
        continue;
      }

      const opacity = alpha / 255;
      rgba[outputIndex] = alpha === 255
        ? red
        : Math.max(0, Math.min(255, Math.round((red - 255 * (1 - opacity)) / opacity)));
      rgba[outputIndex + 1] = alpha === 255
        ? green
        : Math.max(0, Math.min(255, Math.round((green - 255 * (1 - opacity)) / opacity)));
      rgba[outputIndex + 2] = alpha === 255
        ? blue
        : Math.max(0, Math.min(255, Math.round((blue - 255 * (1 - opacity)) / opacity)));
      rgba[outputIndex + 3] = alpha;

      if (alpha >= 12) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) throw new Error('找不到前景圖案');
  return {
    rgba,
    bounds: {
      left: minX,
      top: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    }
  };
}

function findHorizontalSubjects(rgba, width, height) {
  const occupied = new Uint8Array(width);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (rgba[(y * width + x) * 4 + 3] >= 12) occupied[x] = 1;
    }
  }

  const spans = [];
  let start = -1;
  for (let x = 0; x <= width; x += 1) {
    if (x < width && occupied[x]) {
      if (start < 0) start = x;
    } else if (start >= 0) {
      spans.push({ start, end: x - 1 });
      start = -1;
    }
  }

  const merged = [];
  for (const span of spans) {
    const previous = merged.at(-1);
    if (previous && span.start - previous.end <= 12) previous.end = span.end;
    else merged.push({ ...span });
  }
  if (merged.length !== 5) {
    throw new Error(`預期每列辨識到 5 個動物，實際辨識到 ${merged.length} 個：${JSON.stringify(merged)}`);
  }

  return merged.map((span) => {
    let minY = height;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = span.start; x <= span.end; x += 1) {
        if (rgba[(y * width + x) * 4 + 3] >= 12) {
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    return {
      left: span.start,
      top: minY,
      width: span.end - span.start + 1,
      height: maxY - minY + 1
    };
  });
}

const rows = [0, 1].map((row) => {
  const top = Math.round(row * cellHeight);
  const bottom = Math.round((row + 1) * cellHeight);
  const height = bottom - top;
  const transparent = makeTransparentRegion(0, top, info.width, height);
  return {
    rgba: transparent.rgba,
    width: info.width,
    height,
    subjects: findHorizontalSubjects(transparent.rgba, info.width, height)
  };
});

for (let index = 0; index < animals.length; index += 1) {
  const [rankId, name] = animals[index];
  const column = index % 5;
  const row = Math.floor(index / 5);
  const { rgba, width, height, subjects } = rows[row];
  const bounds = subjects[column];
  const available = outputSize - outputPadding * 2;
  const scale = Math.min(available / bounds.width, available / bounds.height);
  const targetWidth = Math.max(1, Math.round(bounds.width * scale));
  const targetHeight = Math.max(1, Math.round(bounds.height * scale));
  const horizontalPadding = outputSize - targetWidth;
  const verticalPadding = outputSize - targetHeight;

  await sharp(rgba, { raw: { width, height, channels: 4 } })
    .extract(bounds)
    .resize(targetWidth, targetHeight, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .extend({
      left: Math.floor(horizontalPadding / 2),
      right: Math.ceil(horizontalPadding / 2),
      top: Math.floor(verticalPadding / 2),
      bottom: Math.ceil(verticalPadding / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(outputDirectory, `${rankId}.png`));

  console.log(`${rankId}.png (${name}): ${bounds.width}x${bounds.height} -> ${targetWidth}x${targetHeight}`);
}
