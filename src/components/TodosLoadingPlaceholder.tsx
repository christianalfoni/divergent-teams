export function TodosLoadingPlaceholder() {
  return () => (
    <div className="animate-pulse px-3">
      <div className="flex gap-3 items-start">
        {/* Checkbox placeholder */}
        <div className="h-4 w-4 bg-[var(--color-skeleton)] rounded mt-0.5 shrink-0"></div>
        {/* Todo text placeholder - double height */}
        <div className="h-10 bg-[var(--color-skeleton)] rounded flex-1"></div>
      </div>
    </div>
  );
}
