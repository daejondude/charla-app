export function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1 py-0.5">
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce-dot [animation-delay:0s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce-dot [animation-delay:0.15s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-bounce-dot [animation-delay:0.3s]" />
    </span>
  );
}
