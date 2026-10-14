import { CAMPAIGN_IMAGES } from '../game/campaignAssets';

export type CampaignStatusKind = 'life' | 'energy' | 'shield' | 'seal' | 'fragment' | 'distance';

interface CampaignStatusSlotsProps {
  kind: CampaignStatusKind;
  current: number;
  maximum: number;
  label?: string;
}

const STATUS_COPY: Record<CampaignStatusKind, {
  label: string;
  full: string;
  empty: string;
  fullImage?: string;
  emptyImage?: string;
}> = {
  life: { label: '生命', full: '♥', empty: '♡', fullImage: CAMPAIGN_IMAGES.lifeFull, emptyImage: CAMPAIGN_IMAGES.lifeEmpty },
  energy: { label: '聲音能量', full: '●', empty: '○', fullImage: CAMPAIGN_IMAGES.energyFull, emptyImage: CAMPAIGN_IMAGES.energyEmpty },
  shield: { label: '護盾', full: '◆', empty: '◇', fullImage: CAMPAIGN_IMAGES.shieldFull, emptyImage: CAMPAIGN_IMAGES.shieldBroken },
  seal: { label: '封印', full: '✦', empty: '◇', fullImage: CAMPAIGN_IMAGES.sealLocked, emptyImage: CAMPAIGN_IMAGES.sealUnlocked },
  fragment: { label: '聲音碎片', full: '◆', empty: '◇' },
  distance: { label: '安全距離', full: '●', empty: '○' }
};

export function CampaignStatusSlots({
  kind,
  current,
  maximum,
  label
}: CampaignStatusSlotsProps) {
  const copy = STATUS_COPY[kind];
  const safeMaximum = Math.max(0, Math.floor(maximum));
  const safeCurrent = Math.min(safeMaximum, Math.max(0, Math.floor(current)));
  return (
    <div
      className={`campaign-status-slots campaign-status-${kind}`}
      aria-label={`${label ?? copy.label} ${safeCurrent}／${safeMaximum}`}
    >
      {Array.from({ length: safeMaximum }, (_, index) => {
        const filled = index < safeCurrent;
        return (
          <span
            key={index}
            className={filled ? 'filled' : 'empty'}
            aria-hidden="true"
          >
            {copy.fullImage && copy.emptyImage ? (
              <img
                src={filled ? copy.fullImage : copy.emptyImage}
                alt=""
                aria-hidden="true"
                draggable="false"
              />
            ) : filled ? copy.full : copy.empty}
          </span>
        );
      })}
    </div>
  );
}
