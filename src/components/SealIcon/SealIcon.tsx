interface SealIconProps {
  size?: number;
  color?: string;
  fill?: string;
  checked?: boolean;
}

export function SealIcon({
  size = 52,
  color = 'currentColor',
  fill = 'none',
  checked = false,
}: SealIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="24" cy="20" r="13" fill={fill} />
      <path d="M17 31l-3 12 10-5 10 5-3-12" />
      {checked ? <path d="M18 20l4 4 8-8" /> : null}
    </svg>
  );
}
