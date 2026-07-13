import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { MediCoreMark } from "./MediCoreMark";

const sizeMap = {
  sm: { mark: "size-6", text: "text-base", gap: "gap-2" },
  md: { mark: "size-8", text: "text-lg", gap: "gap-2.5" },
  lg: { mark: "size-10", text: "text-2xl", gap: "gap-3" },
} as const;

type MediCoreLogoProps = {
  size?: keyof typeof sizeMap;
  showText?: boolean;
  href?: string | null;
  inverted?: boolean;
  className?: string;
};

export function MediCoreLogo({
  size = "md",
  showText = true,
  href = "/",
  inverted = false,
  className,
}: MediCoreLogoProps) {
  const s = sizeMap[size];

  const content = (
    <>
      <MediCoreMark className={s.mark} inverted={inverted} title={undefined} />
      {showText ? (
        <span
          className={cn(
            "font-semibold tracking-tight",
            s.text,
            inverted ? "text-current" : "text-primary",
          )}
        >
          {BRAND_NAME}
        </span>
      ) : (
        <span className="sr-only">{BRAND_NAME}</span>
      )}
    </>
  );

  const classes = cn("inline-flex items-center", s.gap, className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return <span className={classes}>{content}</span>;
}
