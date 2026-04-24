import Image from "next/image";

import { cn } from "@/lib/utils";
import { isRenderableImageUrl } from "@/lib/images";

type Props = {
  username: string;
  avatarUrl: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASSES = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
};

const PIXEL_SIZE = {
  sm: 28,
  md: 40,
  lg: 64,
} as const;

export function UserAvatar({
  username,
  avatarUrl,
  size = "sm",
  className,
}: Props) {
  const base = cn(
    "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-peyi-orange-100 font-display font-bold text-peyi-orange-700",
    SIZE_CLASSES[size],
    className,
  );

  if (isRenderableImageUrl(avatarUrl)) {
    return (
      <span className={base}>
        <Image
          src={avatarUrl}
          alt={`Avatar de @${username}`}
          width={PIXEL_SIZE[size]}
          height={PIXEL_SIZE[size]}
          className="h-full w-full object-cover"
          unoptimized
        />
      </span>
    );
  }

  return (
    <span className={base} aria-hidden>
      {username.slice(0, 2).toUpperCase()}
    </span>
  );
}
