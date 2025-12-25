import { UserContent } from "./UserContent";
import { TeamContent } from "./TeamContent";
import { CreateTeamContent } from "./CreateTeamContent";
import { DrawerContext } from "../../contexts/DrawerContext";

export function Drawer() {
  const drawer = DrawerContext.use();

  return () => {
    return (
      <div class="pointer-events-none fixed inset-y-0 right-0 z-50 flex max-w-full pl-10 sm:pl-16">
        <div
          class={`pointer-events-auto w-screen transform transition-transform duration-500 ease-in-out ${
            drawer.isOpen ? "translate-x-0" : "translate-x-full"
          } ${
            drawer.content?.type === "createTeam" ? "max-w-2xl" : "max-w-md"
          }`}
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
      case "user":
        return (
          <UserContent user={drawer.content.user} onClose={drawer.close} />
        );
    }
  }
}
