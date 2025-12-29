import { UserContent } from "./UserContent";
import { TeamContent } from "./TeamContent";
import { TaskContent } from "./TaskContent";
import { CreateTeamContent } from "./CreateTeamContent";
import { DrawerContext } from "../../contexts/DrawerContext";

export function Drawer() {
  const drawer = DrawerContext.use();

  return () => {
    const getTranslateX = () => {
      if (!drawer.isOpen) {
        return "translate-x-full";
      }

      if (drawer.isExpanded) {
        return "translate-x-0";
      }

      return "translate-x-[672px]";
    };

    return (
      <div class="pointer-events-none fixed inset-y-0 right-0 z-50 flex max-w-full pl-10 sm:pl-16">
        <div
          class={`pointer-events-auto w-screen transform transition-transform duration-500 ease-in-out max-w-[1120px] ${getTranslateX()}`}
        >
          {renderContent()}
        </div>
      </div>
    );
  };

  function renderContent() {
    if (!drawer.content) {
      return null;
    }

    switch (drawer.content.type) {
      case "createTeam":
        return <CreateTeamContent onClose={drawer.close} />;
      case "team":
        return (
          <TeamContent team={drawer.content.team} onClose={drawer.close} />
        );
      case "task":
        return (
          <TaskContent task={drawer.content.task} onClose={drawer.close} />
        );
      case "user":
        return (
          <UserContent user={drawer.content.user} onClose={drawer.close} />
        );
    }
  }
}
