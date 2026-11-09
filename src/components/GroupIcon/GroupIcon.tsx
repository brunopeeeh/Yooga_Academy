import type { ReactElement } from 'react';

/** Ícones dos grupos, na mesma ordem do seed. */
const ICONS: ReadonlyArray<() => ReactElement> = [
  () => <path d="M14 40V8l22 10-22 10" />,
  () => (
    <>
      <rect x="8" y="8" width="32" height="24" rx="3" />
      <path d="M14 15h4M22 15h4M30 15h4M14 21h4M22 21h4M30 21h4M18 40h12M24 32v8" />
    </>
  ),
  () => (
    <>
      <path d="M14 18V8h20v10" />
      <rect x="8" y="18" width="32" height="14" rx="3" />
      <path d="M14 28h20v12H14z" />
      <path d="M18 33h12M18 37h8" />
    </>
  ),
  () => (
    <>
      <path d="M6 30V14h22v16" />
      <path d="M28 20h8l6 6v4h-14" />
      <circle cx="14" cy="34" r="4" />
      <circle cx="34" cy="34" r="4" />
    </>
  ),
  () => (
    <>
      <circle cx="14" cy="26" r="6" />
      <circle cx="36" cy="12" r="5" />
      <circle cx="36" cy="38" r="5" />
      <path d="M19 23l12-8M19 29l12 7" />
    </>
  ),
  () => (
    <>
      <path d="M12 6h22v36l-4-3-4 3-4-3-4 3-4-3-2 2z" />
      <path d="M17 14h12M17 20h12M17 26h8" />
    </>
  ),
  () => (
    <>
      <rect x="6" y="8" width="36" height="28" rx="3" />
      <path d="M6 15h36" />
      <circle cx="18" cy="27" r="6" />
      <path d="M18 21v6h6M30 22h6M30 27h6M30 32h4" />
    </>
  ),
  () => (
    <>
      <path d="M24 8h14v14L22 38 10 26z" />
      <circle cx="32" cy="14" r="2.5" />
    </>
  ),
];

interface GroupIconProps {
  index: number;
  size?: number;
  color?: string;
}

export function GroupIcon({ index, size = 48, color = 'currentColor' }: GroupIconProps) {
  const Icon = ICONS[((index % ICONS.length) + ICONS.length) % ICONS.length] ?? ICONS[0];

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
      <Icon />
    </svg>
  );
}
