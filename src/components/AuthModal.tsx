import { AuthenticationContext } from "../contexts/AuthenticationContext";

export function AuthModal() {
  const authentication = AuthenticationContext.use();

  return () => (
    <div class="relative z-10">
      <div class="fixed inset-0 bg-black/50 transition-opacity" />
      <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <div class="relative transform overflow-hidden rounded-lg bg-(--color-bg-primary) px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-sm sm:p-6 outline -outline-offset-1 outline-(--color-outline)">
            <div>
              <div class="mx-auto flex size-12 items-center justify-center rounded-full bg-(--color-accent-light)">
                <svg
                  class="size-6 text-(--color-accent-text)"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke-width="1.5"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div class="mt-3 text-center sm:mt-5">
                <h3 class="text-base font-semibold text-(--color-text-primary)">
                  Welcome to Divergent Teams
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-(--color-text-secondary)">
                    Sign in to start organizing your team's focus
                  </p>
                </div>
              </div>
            </div>
            <div class="mt-5 sm:mt-6 space-y-3">
              <button
                type="button"
                disabled={authentication.isAuthenticating}
                class="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:ring-white/5 dark:hover:bg-white/20"
                onClick={authentication.login}
              >
                <span class="text-sm font-semibold">Sign in</span>
              </button>
              <p class="text-xs text-(--color-text-secondary) text-center mt-4">
                By signing in, you agree to our{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-(--color-accent-primary) hover:text-(--color-accent-hover) underline"
                >
                  Terms of Service
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
