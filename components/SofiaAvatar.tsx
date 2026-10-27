interface SofiaAvatarProps {
  size?: "sm" | "md" | "lg";
  speaking?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<SofiaAvatarProps["size"]>, string> = {
  sm: "h-9 w-8 text-base",
  md: "h-12 w-11 text-xl",
  lg: "h-24 w-20 text-4xl",
};

/** Sofía as an arch — the app's signature shape. */
export function SofiaAvatar({ size = "md", speaking = false }: SofiaAvatarProps) {
  return (
    <span className="relative inline-flex shrink-0" aria-hidden="true">
      {speaking && (
        <>
          <span className="absolute inset-0 rounded-t-full rounded-b-md bg-brand/50 animate-pulse-ring" />
          <span className="absolute inset-0 rounded-t-full rounded-b-md bg-brand/50 animate-pulse-ring [animation-delay:0.5s]" />
        </>
      )}
      <span
        className={`relative flex items-end justify-center overflow-hidden rounded-t-full rounded-b-md bg-brand pb-[8%] font-display leading-none text-white ${SIZE_CLASSES[size]}`}
      >
        <span className="absolute inset-x-[22%] bottom-0 top-[38%] rounded-t-full bg-night/25" />
        <span className="relative">S</span>
      </span>
    </span>
  );
}
