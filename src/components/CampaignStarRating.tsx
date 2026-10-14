import { CAMPAIGN_IMAGES } from '../game/campaignAssets';

interface CampaignStarRatingProps {
  stars: 0 | 1 | 2 | 3;
  className?: string;
}

export function CampaignStarRating({ stars, className = '' }: CampaignStarRatingProps) {
  return (
    <span className={`campaign-star-rating ${className}`.trim()} aria-label={`${stars} 星`}>
      {Array.from({ length: 3 }, (_, index) => (
        <img
          key={index}
          src={CAMPAIGN_IMAGES.star}
          className={index < stars ? 'earned' : 'unearned'}
          alt=""
          aria-hidden="true"
          draggable="false"
        />
      ))}
    </span>
  );
}
