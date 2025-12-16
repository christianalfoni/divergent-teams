export function MessagesLoadingPlaceholder() {
  return (
    <div className="animate-pulse flex flex-col gap-2">
      {/* Left-aligned message (own message) */}
      <div className="flex justify-start">
        <div className="w-48 h-12 bg-(--color-skeleton) rounded-lg"></div>
      </div>

      {/* Right-aligned message (other user) */}
      <div className="flex justify-end">
        <div className="w-64 h-16 bg-(--color-skeleton) rounded-lg"></div>
      </div>

      {/* Left-aligned message (own message) */}
      <div className="flex justify-start">
        <div className="w-40 h-10 bg-(--color-skeleton) rounded-lg"></div>
      </div>
    </div>
  );
}
