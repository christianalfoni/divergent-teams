import { assignState, useState, useView } from "rask-ui";
import { createContext } from "rask-ui";

type State =
  | {
      isOpen: true;
      onClick: () => void;
    }
  | {
      isOpen: false;
      onClick: null;
    };

export const BackdropContext = createContext(() => {
  const state = useState<State>({
    isOpen: false,
    onClick: null,
  });

  return useView(state, {
    open,
    close,
  });

  function open(onClick: () => void) {
    assignState(state, {
      isOpen: true,
      onClick: () => {
        close();
        onClick();
      },
    });
  }

  function close() {
    assignState(state, {
      isOpen: false,
      onClick: null,
    });
  }
});
