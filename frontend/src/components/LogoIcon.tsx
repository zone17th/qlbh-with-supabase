/**
 * Sello Logo Icon — Icon mark only (bar chart + growth arrow).
 * Extracted from logo.svg for inline use in the app header.
 */
export function LogoIcon({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 220 220"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Sello logo"
    >
      <rect x="0" y="0" width="220" height="220" rx="36" fill="#E35336" />
      {/* Bar chart bars */}
      <rect x="55" y="135" width="30" height="50" rx="5" fill="#F5F5DC" />
      <rect x="95" y="105" width="30" height="80" rx="5" fill="#F5F5DC" opacity="0.85" />
      <rect x="135" y="70" width="30" height="115" rx="5" fill="#F5F5DC" opacity="0.7" />
      {/* Growth arrow */}
      <polyline
        points="125,58 165,48 175,88"
        fill="none"
        stroke="#F4A460"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="170" cy="48" r="7" fill="#F4A460" />
    </svg>
  );
}
