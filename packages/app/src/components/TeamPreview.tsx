import type { TeamMention } from "@divergent-teams/shared";
import { UserGroupIcon } from "./icons/UserGroupIcon";

type Props = {
  team: TeamMention;
};

export function TeamPreview(props: Props) {
  return () => (
    <div className="flex flex-col p-6">
      {/* Team Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <div className="w-7 h-7">
            <UserGroupIcon />
          </div>
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {props.team.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Team</p>
        </div>
      </div>

      {/* Team Info */}
      <div className="space-y-3">
        <div>
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Team ID
          </dt>
          <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
            {props.team.teamId}
          </dd>
        </div>
      </div>
    </div>
  );
}
