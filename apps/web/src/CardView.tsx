import { en, type Card } from '@coddle/content';

export function CardView({
  card,
  compact = false,
}: {
  card: Card;
  compact?: boolean;
}) {
  return (
    <span className={`card-content ${compact ? 'compact' : ''}`}>
      <span className="card-badges">
        {card.cost !== undefined && (
          <span className="cost" aria-label={`${en.cost} ${card.cost}`}>
            {en.icons.stamina}
            {card.cost}
          </span>
        )}
        <span className="tags">{card.tags.join(' · ')}</span>
      </span>
      <span className={`card-art art-${card.artKey}`} aria-hidden="true">
        {en.icons[card.type]}
      </span>
      <strong>{card.name}</strong>
      <span className="card-description">{card.description}</span>
      {!compact && <em>{card.flavor}</em>}
    </span>
  );
}
