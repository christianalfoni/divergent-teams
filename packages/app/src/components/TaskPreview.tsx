import type { TaskMention } from "@divergent-teams/shared";
import { DataContext } from "../contexts/DataContext";
import { DocumentCheckIcon } from "./icons/DocumentCheckIcon";

type Props = {
  task: TaskMention;
};

export function TaskPreview(props: Props) {
  const data = DataContext.use();

  return () => {
    // Find the team this task belongs to
    const team = data.mentions.teams.find((t) => t.id === props.task.teamId);

    return (
      <div className="flex flex-col p-6">
        {/* Task Header */}
        <div className="flex items-center gap-3 mb-4">
          <DocumentCheckIcon className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400" />

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {props.task.title}
            </h3>
            {team && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {team.name}
              </p>
            )}
          </div>
        </div>

        {/* Task Info */}
        <div className="space-y-3">
          <div>
            <dt className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Team
            </dt>
            <dd className="mt-1 text-sm text-gray-900 dark:text-white">
              {team ? team.name : "Unknown Team"}
            </dd>
          </div>
        </div>
      </div>
    );
  };
}
