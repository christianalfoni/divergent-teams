import type { UserMention } from "@divergent-teams/shared";

type Props = {
  user: UserMention;
};

export function UserPreview(props: Props) {
  return () => (
    <div className="flex flex-col p-6">
      {/* User Avatar & Name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-lg font-medium">
          {props.user.displayName.charAt(0)}
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {props.user.displayName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {props.user.email}
          </p>
        </div>
      </div>

      {/* User Info */}
      <div className="space-y-3">
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            User ID
          </dt>
          <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
            {props.user.userId}
          </dd>
        </div>
      </div>
    </div>
  );
}
