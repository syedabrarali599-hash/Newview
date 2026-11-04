type Props = { className?: string; color?: string };

/** The two mirrored corner strokes that make up the New View mark. */
export const LOGO_PATHS = [
  "M13.6996 30.2454H19.1545C28.0138 30.2454 32.4435 30.2453 35.8029 28.4666C38.5138 27.0312 40.7308 24.8142 42.1662 22.1032C43.9449 18.7438 43.945 14.3142 43.945 5.4549V0L13.6996 30.2454Z",
  "M30.2454 9.18168H24.7905C15.9312 9.18168 11.5015 9.18175 8.14213 10.9605C5.43117 12.3959 3.21418 14.6128 1.77878 17.3238C7.21355e-05 20.6832 0 25.1129 0 33.9722V39.427L30.2454 9.18168Z",
];

export const LOGO_VIEWBOX = "0 0 43.945 39.427";

export function LogoMark({ className, color = "#E85313" }: Props) {
  return (
    <svg className={className} viewBox={LOGO_VIEWBOX} fill={color} aria-hidden="true">
      {LOGO_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
