import { useEffect, useRef, useState } from 'react';
import { CAMPAIGN_IMAGES } from '../game/campaignAssets';

interface PreviewPoint {
  x: number;
  y: number;
}

type PreviewScenario = 'idle' | 'wrong' | 'correct';

const SCREEN_ANCHOR = { x: 195, y: 330 };
const START = { x: 320, y: 2100 };
const LEFT_APEX = { x: 175, y: 1945 };
const RIGHT_APEX = { x: 465, y: 1945 };
const MERGE = { x: 320, y: 1710 };
const WRONG_STOP = { x: 112, y: 1740 };
const WRONG_TERMINAL = { x: 92, y: 1688 };
const MAGIC_WALL = { x: 92, y: 1618 };
const FRAGMENT = { x: 320, y: 1660 };
const TRAVEL_DURATION_MS = 2800;

const ENTRY_PATH = 'M 320 2390 C 320 2290, 320 2190, 320 2100';
const LEFT_FRONT_PATH = 'M 320 2100 C 320 2012, 175 2034, 175 1945';
const RIGHT_FRONT_PATH = 'M 320 2100 C 320 2012, 465 2034, 465 1945';
const LEFT_WRONG_PATH = `${LEFT_FRONT_PATH} C 160 1855, 112 1780, 92 1688`;
const RIGHT_CORRECT_PATH = `${RIGHT_FRONT_PATH} C 470 1845, 365 1770, 320 1710`;

function cubicPoint(
  start: PreviewPoint,
  controlA: PreviewPoint,
  controlB: PreviewPoint,
  end: PreviewPoint,
  amount: number
): PreviewPoint {
  const inverse = 1 - amount;
  return {
    x: inverse ** 3 * start.x + 3 * inverse ** 2 * amount * controlA.x + 3 * inverse * amount ** 2 * controlB.x + amount ** 3 * end.x,
    y: inverse ** 3 * start.y + 3 * inverse ** 2 * amount * controlA.y + 3 * inverse * amount ** 2 * controlB.y + amount ** 3 * end.y
  };
}

function sampleCubic(
  start: PreviewPoint,
  controlA: PreviewPoint,
  controlB: PreviewPoint,
  end: PreviewPoint
): PreviewPoint[] {
  return Array.from({ length: 65 }, (_, index) => cubicPoint(start, controlA, controlB, end, index / 64));
}

const LEFT_FRONT_POINTS = sampleCubic(
  START,
  { x: 320, y: 2012 },
  { x: 175, y: 2034 },
  LEFT_APEX
);
const LEFT_WRONG_POINTS = [
  ...LEFT_FRONT_POINTS,
  ...sampleCubic(
    LEFT_APEX,
    { x: 160, y: 1855 },
    { x: 112, y: 1780 },
    WRONG_STOP
  ).slice(1)
];
const RIGHT_CORRECT_POINTS = [
  ...sampleCubic(
    START,
    { x: 320, y: 2012 },
    { x: 465, y: 2034 },
    RIGHT_APEX
  ),
  ...sampleCubic(
    RIGHT_APEX,
    { x: 470, y: 1845 },
    { x: 365, y: 1770 },
    MERGE
  ).slice(1)
];

function pointAtProgress(points: readonly PreviewPoint[], progress: number): PreviewPoint {
  const distances = points.slice(1).map((point, index) => Math.hypot(
    point.x - points[index].x,
    point.y - points[index].y
  ));
  const total = distances.reduce((sum, distance) => sum + distance, 0);
  let remaining = total * progress;
  for (let index = 1; index < points.length; index += 1) {
    const distance = distances[index - 1];
    if (remaining <= distance) {
      const amount = distance === 0 ? 1 : remaining / distance;
      return {
        x: points[index - 1].x + (points[index].x - points[index - 1].x) * amount,
        y: points[index - 1].y + (points[index].y - points[index - 1].y) * amount
      };
    }
    remaining -= distance;
  }
  return points.at(-1) ?? START;
}

const ROAD_LAYERS = [
  { id: 'clearing', width: 138 },
  { id: 'shoulder', width: 88 },
  { id: 'fill', width: 62 }
] as const;

export function SoundMazeFourFixesPreview() {
  const [scenario, setScenario] = useState<PreviewScenario>('idle');
  const [cameraPoint, setCameraPoint] = useState<PreviewPoint>(START);
  const [progress, setProgress] = useState(0);
  const [arrived, setArrived] = useState(false);
  const frameRef = useRef<number | null>(null);

  const reset = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    setScenario('idle');
    setCameraPoint(START);
    setProgress(0);
    setArrived(false);
  };

  const runScenario = (nextScenario: Exclude<PreviewScenario, 'idle'>) => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    const points = nextScenario === 'wrong' ? LEFT_WRONG_POINTS : RIGHT_CORRECT_POINTS;
    setScenario(nextScenario);
    setCameraPoint(START);
    setProgress(0);
    setArrived(false);
    const startedAt = performance.now();
    const tick = (now: number) => {
      const nextProgress = Math.min(1, (now - startedAt) / TRAVEL_DURATION_MS);
      setProgress(nextProgress);
      setCameraPoint(pointAtProgress(points, nextProgress));
      if (nextProgress < 1) frameRef.current = requestAnimationFrame(tick);
      else {
        frameRef.current = null;
        setArrived(true);
      }
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  const transform = `translate(${SCREEN_ANCHOR.x - cameraPoint.x}px, ${SCREEN_ANCHOR.y - cameraPoint.y}px)`;
  const leftPath = scenario === 'wrong' ? LEFT_WRONG_PATH : LEFT_FRONT_PATH;
  const rightPath = scenario === 'correct' ? RIGHT_CORRECT_PATH : RIGHT_FRONT_PATH;
  const showFragment = scenario === 'correct' && progress >= 0.7;

  return (
    <main className="screen campaign-gameplay-screen sound-maze-fix-preview">
      <header className="campaign-gameplay-header">
        <span className="campaign-gameplay-header-spacer" aria-hidden="true" />
        <div className="campaign-gameplay-heading">
          <strong>聲音迷宮・四項修正測試版</strong>
          <div>獨立預覽，不影響正式關卡</div>
        </div>
        <span className="campaign-gameplay-header-spacer" aria-hidden="true" />
      </header>

      <section className="campaign-gameplay-stage sound-maze-fix-stage">
        <div className="sound-maze-fix-shell">
        <div
          className={`sound-maze-viewport sound-maze-map-viewport sound-maze-fix-viewport scenario-${scenario}`}
          data-scenario={scenario}
          aria-label="聲音迷宮四項修正獨立測試"
        >
          <svg className="sound-maze-world" viewBox="0 0 390 520" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <defs>
              <pattern id="fix-forest-ground" patternUnits="userSpaceOnUse" width="768" height="768">
                <image href={CAMPAIGN_IMAGES.soundMazeForestGround} width="768" height="768" preserveAspectRatio="none" />
              </pattern>
              <pattern id="fix-road" patternUnits="userSpaceOnUse" width="512" height="512">
                <image href={CAMPAIGN_IMAGES.soundMazeRoadTexture} width="512" height="512" preserveAspectRatio="none" />
              </pattern>
              <pattern id="fix-clearing" patternUnits="userSpaceOnUse" width="512" height="512">
                <image href={CAMPAIGN_IMAGES.soundMazeRoadClearingTexture} width="512" height="512" preserveAspectRatio="none" />
              </pattern>
              <filter id="fix-clearing-feather" x="-250" y="-250" width="1140" height="2860" filterUnits="userSpaceOnUse">
                <feGaussianBlur stdDeviation="8" />
              </filter>
              {ROAD_LAYERS.map((layer) => (
                <mask key={layer.id} id={`fix-road-mask-${layer.id}`} x="-200" y="-200" width="1040" height="2760" maskUnits="userSpaceOnUse">
                  <path d={ENTRY_PATH} fill="none" stroke="white" strokeWidth={layer.width} strokeLinecap="round" strokeLinejoin="round" />
                  <path
                    className={`sound-maze-fix-branch route-left ${scenario === 'correct' ? 'is-hidden' : ''}`}
                    d={leftPath}
                    fill="none"
                    stroke="white"
                    strokeWidth={layer.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    className={`sound-maze-fix-branch route-right ${scenario === 'wrong' ? 'is-hidden' : ''}`}
                    d={rightPath}
                    fill="none"
                    stroke="white"
                    strokeWidth={layer.width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </mask>
              ))}
            </defs>

            <g className="sound-maze-camera" style={{ transform }}>
              <rect x="-200" y="-200" width="1040" height="2760" fill="url(#fix-forest-ground)" />
              {[1640, 1980, 2320].map((y) => (
                <g key={y}>
                  <image href={CAMPAIGN_IMAGES.soundMazeForestBankLeft} x="24" y={y} width="256" height="384" preserveAspectRatio="none" />
                  <g transform="translate(640 0) scale(-1 1)">
                    <image href={CAMPAIGN_IMAGES.soundMazeForestBankLeft} x="24" y={y} width="256" height="384" preserveAspectRatio="none" />
                  </g>
                </g>
              ))}
              {ROAD_LAYERS.map((layer) => (
                <rect
                  key={layer.id}
                  className={`sound-maze-fix-road layer-${layer.id}`}
                  x="-200"
                  y="-200"
                  width="1040"
                  height="2760"
                  mask={`url(#fix-road-mask-${layer.id})`}
                  filter={layer.id === 'clearing' ? 'url(#fix-clearing-feather)' : undefined}
                />
              ))}
              <g className="sound-maze-landmark" transform="translate(320 1988)">
                <image href={CAMPAIGN_IMAGES.soundMazeLandmarkStone} x="-54" y="-51" width="108" height="102" />
              </g>
              {showFragment && (
                <g className="sound-maze-map-fragment" transform={`translate(${FRAGMENT.x} ${FRAGMENT.y})`}>
                  <image href={CAMPAIGN_IMAGES.soundFragmentLarge} x="-24" y="-24" width="48" height="48" />
                </g>
              )}
              {scenario === 'wrong' && (
                <g className="sound-maze-magic-wall" transform={`translate(${MAGIC_WALL.x} ${MAGIC_WALL.y})`}>
                  <image href={CAMPAIGN_IMAGES.soundMazeMagicMistWall} x="-96" y="-90" width="192" height="180" />
                </g>
              )}
              {scenario === 'wrong' && <circle cx={WRONG_TERMINAL.x} cy={WRONG_TERMINAL.y} r="2" fill="transparent" />}
            </g>
          </svg>

          <div className="sound-maze-fix-edge-fog" aria-hidden="true" />
          <div className={`sound-maze-fix-top-fog ${scenario === 'idle' ? 'is-visible' : ''}`} aria-hidden="true" />
        </div>

        <div className="sound-maze-fix-controls" aria-label="測試控制">
          <button type="button" disabled={scenario !== 'idle'} onClick={() => runScenario('wrong')}>測試錯誤路線</button>
          <button type="button" disabled={scenario !== 'idle'} onClick={() => runScenario('correct')}>測試正確路線</button>
          <button type="button" className="secondary" onClick={reset}>重置岔路</button>
        </div>
        <p className="campaign-gameplay-hint sound-maze-fix-status" aria-live="polite">
          {scenario === 'idle' && '請分別測試錯誤路線與正確路線。'}
          {scenario === 'wrong' && !arrived && '錯誤路線：另一側同步淡出，正在深入森林。'}
          {scenario === 'wrong' && arrived && '錯誤路線終點：紫霧遮住死路，聲音碎片不顯示。'}
          {scenario === 'correct' && !arrived && '正確路線：錯誤側完整淡出，正在前往匯合點。'}
          {scenario === 'correct' && arrived && '正確路線終點：抵達匯合點並看見聲音碎片。'}
        </p>
        </div>
      </section>
    </main>
  );
}
