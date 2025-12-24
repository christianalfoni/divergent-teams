import { useRef, useMountEffect } from "rask-ui";
import { SearchPaletteContext } from "../contexts/SearchPaletteContext";
import {
  SmartEditor,
  RichTextDisplay,
  type SmartEditorApi,
} from "./SmartEditor";
import { useTodoConversation } from "../hooks/useTodoConversation";
import { AuthenticationContext } from "../contexts/AuthenticationContext";
import type { Todo } from "@divergent-teams/shared";
import { MessagesLoadingPlaceholder } from "./MessagesLoadingPlaceholder";
import { DataContext } from "../contexts/DataContext";

type Props = {
  width: number;
  todo: Todo;
};

function formatTimestamp(timestamp: { toDate: () => Date }): string {
  const date = timestamp.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // For older messages, show date
  const isThisYear = date.getFullYear() === now.getFullYear();
  if (isThisYear) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function TodoConversation(props: Props) {
  const data = DataContext.use();
  const searchPalette = SearchPaletteContext.use();
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
      className="shrink-0 flex flex-col dark:bg-gray-700/10 h-full"
      style={{
        width: `${props.width}px`,
      }}
    >
      {/* Messages container */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-3 flex flex-col justify-end gap-2"
      >
        {conversation.messages.isLoading ? (
          <MessagesLoadingPlaceholder />
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.userId === authentication.user?.id;

            return (
              <div
                key={message.id}
                className={`flex ${
                  isOwnMessage ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-3 py-2 bg-(--color-bg-primary) text-(--color-text-primary)`}
                >
                  <div className="text-xs opacity-75 mb-1 flex items-center gap-2">
                    <span className="font-medium">
                      {data.lookupUserMention(message.userId)?.displayName}
                    </span>
                    <span className="opacity-60">
                      {formatTimestamp(message.createdAt)}
                    </span>
                  </div>
                  <RichTextDisplay value={message.richText} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Message input - at bottom */}
      <div className="p-3 pt-0">
        <div className="overflow-hidden rounded-lg px-3 py-2 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600 dark:bg-white/5 dark:outline-white/10 dark:focus-within:outline-indigo-500 text-(--color-text-primary)">
          <SmartEditor
            apiRef={editorRef}
            placeholder="Type a message..."
            onSubmit={(richText) => {
              if (!richText.text) {
                return;
              }

              conversation.submitMessage(richText);
            }}
            onMention={(api) => {
              searchPalette.openForMention((mention) => {
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
