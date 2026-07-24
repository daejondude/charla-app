interface SofiaAvatarProps {
  size?: "sm" | "md" | "lg";
  speaking?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<SofiaAvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-sm",
  md: "h-11 w-11 text-lg",
  lg: "h-20 w-20 text-3xl",
};

export function SofiaAvatar({ size = "md", speaking = false }: SofiaAvatarProps) {
  return (
    <span className="relative inline-flex shrink-0">
      {speaking && (
        <>
          <span className="absolute inset-0 rounded-full bg-brand/50 animate-pulse-ring" />
          <span className="absolute inset-0 rounded-full bg-brand/50 animate-pulse-ring [animation-delay:0.5s]" />
        </>
      )}
      <span
        className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-dark font-display font-bold text-white shadow-sm ${SIZE_CLASSES[size]}`}
      >
        S
      </span>
    </span>
  );
}
