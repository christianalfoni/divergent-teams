import type { UserMention } from "@divergent-teams/shared";
import { useUser } from "../hooks/useUser";

type Props = {
  user: UserMention;
};

export function UserPreview(props: Props) {
  const userState = useUser(props.user.userId);

  return () => (
    <div className="flex flex-col p-6">
      {/* User Avatar & Name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-lg font-medium">
          {props.user.displayName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {props.user.displayName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {renderJoinedAt()}
          </p>
        </div>
      </div>

      {/* User Info */}
      <div className="space-y-3">
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Email
          </dt>
          <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
            {renderEmail()}
          </dd>
        </div>
      </div>
    </div>
  );

  function renderJoinedAt() {
    if (userState.error) {
      return null;
    }

    if (userState.isLoading) {
      return (
        <div className="animate-pulse mt-1">
          <div className="h-4 w-32 bg-(--color-skeleton) rounded"></div>
        </div>
      );
    }

    return `Joined ${userState.value.createdAt.toDate().toLocaleDateString()}`;
  }

  function renderEmail() {
    if (userState.error) {
      return String(userState.error);
    }

    if (userState.isLoading) {
      return (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <div className="animate-pulse mt-1">
            <div className="h-4 w-32 bg-(--color-skeleton) rounded"></div>
          </div>
        </p>
      );
    }

    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        <a
          href={`mailto:${userState.value.email}`}
          className="text-sm/6 font-semibold text-indigo-600 dark:text-indigo-400"
        >
          {userState.value.email}
        </a>
      </p>
    );
  }
}
