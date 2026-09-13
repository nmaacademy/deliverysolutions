import { SVGProps } from 'react';

interface Props extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  size?: number;
}

/**
 * The restaurant's icon: a wide soup pot with side handles and a ladle, drawn in lucide's style
 * (24x24, 2px round strokes). Lucide's own cooking pot has a lid and reads as a bin at small sizes.
 */
export default function SoupPotIcon({ size = 24, ...props }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M3 10.5h18" />
      <path d="M5 10.5V17a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4v-6.5" />
      <path d="M5 13.5H2.5M19 13.5h2.5" />
      <path d="m12.5 10.5 4-6.6a1.8 1.8 0 0 1 3.1 1.8" />
    </svg>
  );
}
