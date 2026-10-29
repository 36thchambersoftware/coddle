import { en } from '@coddle/content';

const skin = ['#ffd4b5', '#dba064', '#925637'];
export function Portrait({
  variant = 0,
  floating = false,
}: {
  variant?: number;
  floating?: boolean;
}) {
  return (
    <div
      className={`portrait ${floating ? 'floating' : ''}`}
      role="img"
      aria-label={en.icons.baby}
    >
      {floating && <span className="balloon">{en.icons.balloon}</span>}
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="57" fill="#dbece8" />
        <path d="M25 111 Q60 72 95 111" fill="#bdc7ed" />
        <ellipse
          cx="60"
          cy="58"
          rx="35"
          ry="37"
          fill={skin[variant]}
          stroke="#49323b"
          strokeWidth="2"
        />
        <path
          d="M56 24 Q73 4 66 29"
          fill="none"
          stroke="#49323b"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="46" cy="54" r="3" fill="#49323b" />
        <circle cx="75" cy="54" r="3" fill="#49323b" />
        <ellipse cx="39" cy="66" rx="7" ry="4" fill="#ed95a0" />
        <ellipse cx="81" cy="66" rx="7" ry="4" fill="#ed95a0" />
        <ellipse
          cx="60"
          cy="75"
          rx="12"
          ry="8"
          fill="#afc7dc"
          stroke="#49323b"
          strokeWidth="2"
        />
        <circle
          cx="60"
          cy="76"
          r="5"
          fill="#f3e1a6"
          stroke="#49323b"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}
