import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/format";

type Props = {
  price: number | string;
  originalPrice?: number | string | null;
  discountPercent?: number | null;
  isFree?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function PriceTag({
  price,
  originalPrice,
  discountPercent,
  isFree,
  size = "md",
  className,
}: Props) {
  if (isFree) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-md bg-peyi-green-100 px-2 py-0.5 font-bold text-peyi-green-800",
          size === "lg" ? "text-lg" : size === "sm" ? "text-xs" : "text-base",
          className,
        )}
      >
        Gratuit
      </span>
    );
  }

  const priceClass =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg";
  const originalClass =
    size === "lg" ? "text-base" : size === "sm" ? "text-xs" : "text-sm";
  const discountClass =
    size === "lg" ? "text-sm px-2 py-1" : "text-xs px-1.5 py-0.5";

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span className={cn("font-bold text-foreground", priceClass)}>
        {formatPrice(price)}
      </span>
      {originalPrice != null && (
        <span className={cn("text-muted-foreground line-through", originalClass)}>
          {formatPrice(originalPrice)}
        </span>
      )}
      {discountPercent != null && discountPercent > 0 && (
        <span
          className={cn(
            "rounded bg-peyi-orange-500 font-bold text-white",
            discountClass,
          )}
        >
          −{discountPercent}%
        </span>
      )}
    </div>
  );
}
