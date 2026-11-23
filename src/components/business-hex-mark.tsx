import { BRAND_HEX_PATH, BRAND_HEX_VIEWBOX } from "@/lib/brand-hex-path";
import { cn } from "@/lib/utils";

type BusinessHexMarkProps = {
  className?: string;
  shapeClassName?: string;
  "aria-hidden"?: boolean;
  "aria-label"?: string;
};

export function BusinessHexMark({
  className,
  shapeClassName,
  "aria-hidden": ariaHidden,
  "aria-label": ariaLabel = "BizOS business hex",
}: BusinessHexMarkProps) {
  return (
    <svg
      className={cn(className)}
      viewBox={BRAND_HEX_VIEWBOX}
      role={ariaHidden ? undefined : "img"}
      aria-hidden={ariaHidden}
      aria-label={ariaHidden ? undefined : ariaLabel}
      focusable="false"
    >
      <path className={shapeClassName} d={BRAND_HEX_PATH} />
    </svg>
  );
}