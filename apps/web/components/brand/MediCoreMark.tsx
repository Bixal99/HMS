import { cn } from "@/lib/utils";

type MediCoreMarkProps = {
  className?: string;
  /** When true, uses currentColor for strokes/fills (for light-on-dark panels). */
  inverted?: boolean;
  title?: string;
};

/**
 * MediCore brand mark: rounded square, medical cross, and ECG-style pulse.
 */
export function MediCoreMark({
  className,
  inverted = false,
  title = "MediCore",
}: MediCoreMarkProps) {
  const fill = inverted ? "currentColor" : "hsl(var(--primary))";
  const ink = inverted ? "hsl(var(--primary))" : "white";

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      <rect x="1" y="1" width="30" height="30" rx="8" fill={fill} />
      {/* Cross */}
      <path
        d="M14.5 8.5h3v5h5v3h-5v5h-3v-5h-5v-3h5v-5z"
        fill={ink}
        opacity={0.95}
      />
      {/* Pulse line */}
      <path
        d="M6 22.5h4.2l1.4-3.2 2.2 6.4 2.4-8.8 1.8 5.6H26"
        stroke={ink}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
        className="medicore-mark-pulse"
      />
    </svg>
  );
}
