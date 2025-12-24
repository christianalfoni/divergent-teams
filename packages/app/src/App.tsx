import { useState } from "rask-ui";
import { AuthenticationContext } from "./contexts/AuthenticationContext";
import { FirebaseContext } from "./contexts/FirebaseContext";
import { ThemeContext } from "./contexts/ThemeContext";
import { TopBar } from "./components/TopBar";
import { Calendar } from "./components/Calendar";
import { DataContext } from "./contexts/DataContext";
import { AuthModal } from "./components/AuthModal";
import { JSONStorageContext } from "./contexts/JSONStorageContext";
import { SearchPaletteContext } from "./contexts/SearchPaletteContext";
import { SearchPalette } from "./components/SearchPalette";
import { CreateTeamDrawer } from "./components/CreateTeamDrawer";

export function App() {
  FirebaseContext.inject();
  ThemeContext.inject();
  SearchPaletteContext.inject();
  JSONStorageContext.inject("divergent-teams");
  const authentication = AuthenticationContext.inject();
  DataContext.inject();

  const openCreateTeamModal = () => {
    state.showCreateTeamModal = true;
  };

  const closeCreateTeamModal = () => {
    state.showCreateTeamModal = false;
  };

  const state = useState({
    showCreateTeamModal: false,
  });

  return () => {
    const showAuthModal =
      !authentication.isAuthenticating && !authentication.user;

    return (
      <div class="min-h-screen bg-(--color-bg-primary) flex flex-col">
        <TopBar onCreateTeam={openCreateTeamModal} />
        <Calendar />
        {showAuthModal ? <AuthModal /> : null}
        <SearchPalette />
        <CreateTeamDrawer
          isOpen={state.showCreateTeamModal}
          onClose={closeCreateTeamModal}
        />
      </div>
    );
  };
}
