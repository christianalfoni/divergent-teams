import { useRef, useMountEffect } from "rask-ui";
import { MentionsContext } from "../contexts/MentionsContext";
import {
  SmartEditor,
  RichTextDisplay,
  type SmartEditorApi,
} from "./SmartEditor";
import { useTodoConversation } from "../hooks/useTodoConversation";
import { AuthenticationContext } from "../contexts/AuthenticationContext";
import type { Todo } from "@divergent-teams/shared";

type Props = {
  width: number;
  todo: Todo;
};

export function TodoConversation(props: Props) {
  const mentions = MentionsContext.use();
  const authentication = AuthenticationContext.use();
  const conversation = useTodoConversation(props.todo);
  const editorRef = useRef<SmartEditorApi>();
  const messagesContainerRef = useRef<HTMLDivElement>();
  const messages = conversation.messages.data;

  // Auto-scroll to bottom when messages change
  useMountEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
    setTimeout(() => {
      editorRef.current?.focus();
    }, 350);
  });

  return () => (
    <div
      className="shrink-0 flex flex-col bg-(--color-bg-hover) h-full"
      style={{
        width: `${props.width}px`,
      }}
    >
      {/* Messages container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-3 flex flex-col justify-end gap-2"
      >
        {messages.map((message) => {
          const isOwnMessage = message.userId === authentication.user?.id;

          return (
            <div
              key={message.id}
              className={`flex ${
                isOwnMessage ? "justify-start" : "justify-end"
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-3 py-2 ${
                  isOwnMessage
                    ? "bg-(--color-accent-primary) text-white"
                    : "bg-(--color-bg-primary) text-(--color-text-primary)"
                }`}
              >
                <RichTextDisplay value={message.richText} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Message input - at bottom */}
      <div className="p-3 pt-0">
        <div className="border border-(--color-border-secondary) rounded-lg px-3 py-2 bg-(--color-bg-primary) text-(--color-text-primary)">
          <SmartEditor
            apiRef={editorRef}
            placeholder="Type a message..."
            onSubmit={(richText) => {
              if (!richText.text) {
                return;
              }

              conversation.submitMessage(richText);
              editorRef.current?.clear();
            }}
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
