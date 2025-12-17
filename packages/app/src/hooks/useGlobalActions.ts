import { useMountEffect } from "rask-ui";
import { CommandPaletteContext } from "../contexts/CommandPaletteContext";
import { FolderPlusIcon } from "../components/icons/FolderPlusIcon";
import { DocumentPlusIcon } from "../components/icons/DocumentPlusIcon";
import { UserGroupIcon } from "../components/icons/UserGroupIcon";

export function useGlobalActions(props: {
  openCreateTeamModal: () => void;
}) {
  const commandPalette = CommandPaletteContext.use();

  useMountEffect(() => {
    // Register create team action (primary)
    commandPalette.registerAction({
      id: "create-team",
      name: "Create new team...",
      icon: UserGroupIcon,
      shortcut: "T",
      category: "Create",
      onSelect: props.openCreateTeamModal,
    });

    // Register create issue action
    commandPalette.registerAction({
      id: "create-issue",
      name: "Create new issue...",
      icon: DocumentPlusIcon,
      shortcut: "I",
      category: "Create",
      onSelect: () => {
        // TODO: Implement issue creation
        console.log("Create issue");
        alert("Create issue - TODO: Implement issue creation flow");
      },
    });

    // Cleanup: unregister when component unmounts
    return () => {
      commandPalette.unregisterAction("create-team");
      commandPalette.unregisterAction("create-issue");
    };
  });
}
