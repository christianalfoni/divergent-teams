import { useMountEffect } from "rask-ui";
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
import { Drawer } from "./components/Drawer";
import { BackdropContext } from "./contexts/BackdropContext";
import { Backdrop } from "./components/Backdrop";
import { DrawerContext } from "./contexts/DrawerContext";
import { CacheContext } from "./contexts/CacheContext";

export function App() {
  JSONStorageContext.inject("divergent-teams");
  FirebaseContext.inject();
  ThemeContext.inject();
  CacheContext.inject();

  const authentication = AuthenticationContext.inject();

  DataContext.inject();

  const backdrop = BackdropContext.inject();
  const drawer = DrawerContext.inject();
  const search = SearchPaletteContext.inject();

  // Handle CMD + K / CTRL + K keyboard shortcut
  useMountEffect(registerSearchPaletteShortcut);

  return () => {
    const showAuthModal =
      !authentication.isAuthenticating && !authentication.user;

    return (
      <div class="min-h-screen bg-(--color-bg-primary) flex flex-col">
        <TopBar />
        <Calendar />
        {showAuthModal ? <AuthModal /> : null}
        <Backdrop />
        <Drawer />
        <SearchPalette />
      </div>
    );
  };

  function registerSearchPaletteShortcut() {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (search.isOpen) {
          search.close();
          if (!drawer.isOpen) {
            backdrop.close();
          }
        } else {
          backdrop.open(() => {
            search.close();
            drawer.close();
          });
          search.open((mention) => {
            if (!mention) {
              backdrop.close();
              return;
            }

            switch (mention.type) {
              case "team": {
                drawer.open({
                  type: "team",
                  team: mention,
                });
                break;
              }
              case "user": {
                drawer.open({
                  type: "user",
                  user: mention,
                });
                break;
              }
              case "task": {
                drawer.open({
                  type: "task",
                  task: mention,
                });
                break;
              }
            }
          });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }
}
