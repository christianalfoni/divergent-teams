export function TopBar() {
  return (
    <nav class="border-b bg-(--color-bg-nav) border-(--color-border-primary)">
      <div class="px-4">
        <div class="relative flex h-16 justify-between">
          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
              <span class="text-lg font-semibold text-(--color-text-primary)">
                Divergent Teams
              </span>
            </div>
          </div>

          <div class="hidden sm:ml-6 sm:flex sm:items-center gap-3">
            {/* Top bar content will go here */}
          </div>
        </div>
      </div>
    </nav>
  );
}
