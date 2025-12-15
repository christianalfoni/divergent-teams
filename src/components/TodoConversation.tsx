import { MentionsContext } from "../contexts/MentionsContext";
import { SmartEditor } from "./SmartEditor";

type Props = {
  width: number;
};

export function TodoConversation(props: Props) {
  const mentions = MentionsContext.use();

  return () => (
    <div
      className="shrink-0 flex flex-col bg-(--color-bg-hover) h-full"
      style={{
        width: `${props.width}px`,
      }}
    >
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Messages will go here */}
      </div>

      {/* Message input - at bottom */}
      <div className="p-3 pt-0">
        <div className="border border-(--color-border-secondary) rounded-lg px-3 py-2 bg-(--color-bg-primary) text-(--color-text-primary)">
          <SmartEditor
            placeholder="Type a message..."
            onMention={(api) => {
              mentions.open((mention) => {
                if (!mention) {
                  return;
                }

                api.insertMention(mention);
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
