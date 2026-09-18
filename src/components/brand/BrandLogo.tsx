interface Props {
  className?: string;
  /** Empty alt makes the logo decorative when the surrounding control already has a label. */
  alt?: string;
}

/** The supplied artwork stays intact so its hand-drawn lettering is never approximated with a web font. */
export default function BrandLogo({ className = '', alt = 'Rețetar demo' }: Props) {
  return (
    <img
      src="/branding/retetar-logo.svg"
      width={1009}
      height={850}
      alt={alt}
      draggable={false}
      className={`block object-contain select-none ${className}`}
    />
  );
}
