import { AuthenticationContext } from "../contexts/AuthenticationContext";
import { DrawerContext } from "../contexts/DrawerContext";
import { UserGroupIcon } from "./icons/UserGroupIcon";

export function TopBar() {
  const authentication = AuthenticationContext.use();
  const drawer = DrawerContext.use();

  return () => (
    <nav class="border-b bg-(--color-bg-nav) border-(--color-border-primary)">
      <div class="px-4">
        <div class="relative flex h-16 justify-between">
          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
              <span class="text-lg font-semibold text-(--color-text-primary)">
                Divergent Teams
              </span>
            </div>
            {authentication.user ? (
              <div class="flex items-center gap-2 text-sm text-(--color-text-secondary)">
                <span>•</span>
                <span>{authentication.user.displayName || authentication.user.email}</span>
              </div>
            ) : null}
          </div>

          <div class="hidden sm:ml-6 sm:flex sm:items-center gap-3">
            <button
              onClick={() => drawer.open({ type: "createTeam" })}
              class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <div class="w-4 h-4">
                <UserGroupIcon />
              </div>
              Create team
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
