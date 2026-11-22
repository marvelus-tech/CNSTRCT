import { cn } from "@/lib/utils";

const HEX_PATH =
  "M 100 36.3 V 72.06 Q 100 83.19 90 88.86 L 60 105.87 C 58.43 106.76 54 108.36 50 108.36 C 46 108.36 41.57 106.76 40 105.87 L 10 88.86 Q 0 83.19 0 72.06 V 36.3 Q 0 25.17 10 19.5 L 40 2.49 C 41.57 1.6 46 0 50 0 C 54 0 58.43 1.6 60 2.49 L 90 19.5 Q 100 25.17 100 36.3 Z";

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
      viewBox="0 0 100 108.36"
      role={ariaHidden ? undefined : "img"}
      aria-hidden={ariaHidden}
      aria-label={ariaHidden ? undefined : ariaLabel}
      focusable="false"
    >
      <path className={shapeClassName} d={HEX_PATH} />
    </svg>
  );
}