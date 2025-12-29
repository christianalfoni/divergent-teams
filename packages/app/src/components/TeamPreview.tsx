import type { TeamMention } from "@divergent-teams/shared";
import { DataContext } from "../contexts/DataContext";

type Props = {
  team: TeamMention;
};

export function TeamPreview(props: Props) {
  const data = DataContext.use();

  return () => (
    <div className="flex flex-col p-6">
      {/* Team Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 text-lg font-semibold">
          {props.team.name.charAt(0)}
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {props.team.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {props.team.members.length} member
            {props.team.members.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Members List */}
      <div className="mt-6">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3">
          MEMBERS
        </h3>
        <div className="space-y-2">
          {props.team.members.map((userId) => {
            const user = data.lookupUserMention(userId);
            if (!user) return null;

            return (
              <div
                key={userId}
                className="flex items-center text-sm text-gray-700 dark:text-gray-300"
              >
                <div className="w-6 h-6 flex-none rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-700 dark:text-yellow-400 text-xs font-semibold">
                  {user.displayName.charAt(0)}
                </div>
                <span className="ml-3 flex-auto truncate">
                  {user.displayName}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
