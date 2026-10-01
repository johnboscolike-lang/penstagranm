import { PixelIcon } from "@/components/pixel/PixelSprite";
import type { LeagueView } from "@/utils/arena-types";

interface LeagueBadgeProps {
  league: LeagueView;
  compact?: boolean;
}

/**
 * 리그 이름과 아이콘을 작은 이름표로 보여 준다.
 */
export function LeagueBadge({ league, compact }: LeagueBadgeProps) {
  return (
    <span className={`league league--${league.key}`}>
      <PixelIcon name={league.icon} />
      {compact ? null : <span>{league.name}</span>}
    </span>
  );
}
