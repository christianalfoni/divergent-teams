import { useState } from "rask-ui";
import { AuthenticationContext } from "./contexts/AuthenticationContext";
import { FirebaseContext } from "./contexts/FirebaseContext";
import { ThemeContext } from "./contexts/ThemeContext";
import { TopBar } from "./components/TopBar";
import { Calendar } from "./components/Calendar";
import { DataContext } from "./contexts/DataContext";
import { AuthModal } from "./components/AuthModal";
import { JSONStorageContext } from "./contexts/JSONStorageContext";
import { MentionsPaletteContext } from "./contexts/MentionsPaletteContext";
import { CommandPaletteContext } from "./contexts/CommandPaletteContext";
import { CommandPalette } from "./components/CommandPalette";
import { CreateTeamDrawer } from "./components/CreateTeamDrawer";
import { useGlobalActions } from "./hooks/useGlobalActions";

export function App() {
  FirebaseContext.inject();
  ThemeContext.inject();
  MentionsPaletteContext.inject();
  CommandPaletteContext.inject();
  JSONStorageContext.inject("divergent-teams");
  const authentication = AuthenticationContext.inject();
  DataContext.inject();

  const openCreateTeamModal = () => {
    state.showCreateTeamModal = true;
  };

  const closeCreateTeamModal = () => {
    state.showCreateTeamModal = false;
  };

  useGlobalActions({
    openCreateTeamModal,
  });

  const state = useState({
    showCreateTeamModal: false,
  });

  return () => {
    const showAuthModal =
      !authentication.isAuthenticating && !authentication.user;

    return (
      <div class="min-h-screen bg-(--color-bg-primary) flex flex-col">
        <TopBar />
        <Calendar />
        {showAuthModal ? <AuthModal /> : null}
        <CommandPalette />
        <CreateTeamDrawer
          isOpen={state.showCreateTeamModal}
          onClose={closeCreateTeamModal}
        />
      </div>
    );
  };
}
