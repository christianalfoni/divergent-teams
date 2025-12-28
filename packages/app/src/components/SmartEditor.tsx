import { assignRef, useMountEffect, useRef, type Ref } from "rask-ui";
import type { Mention } from "@divergent-teams/shared";
import type { Resource, RichText } from "@divergent-teams/shared";
import { DataContext } from "../contexts/DataContext";

// Re-export for backwards compatibility
export type { Resource, RichText };

type SmartEditorProps = {
  initialValue?: RichText;
  apiRef?: Ref<SmartEditorApi>;
  onSubmit?: (value: RichText) => void;
  placeholder?: string;
  focus?: boolean;
  onKeyDown?: (e: Rask.KeyboardEvent<HTMLDivElement>) => void;
  onBlur?: () => void;
  availableTags?: string[]; // List of all tag texts from other todos for autocomplete
  onMention?: (smartEditorApi: SmartEditorApi) => void;
  className?: string;
  disabled?: boolean;
};

type RichTextDisplayProps = {
  value: RichText;
  onUserClick?: (userId: string) => void;
  onTeamClick?: (teamId: string) => void;
  onTaskClick?: (taskId: string) => void;
};

export type SmartEditorApi = {
  clear: () => void;
  focus: () => void;
  setValue: (value: RichText) => void;
  getValue: () => RichText;
  cancelMention: () => void;
  insertMention: (mention: Mention) => void;
};

const URL_REGEX = /^(https?:\/\/)?([\w.-]+)(:\d+)?(\/[^\s]*)?$/i;
const TAG_REGEX = /^#(\w+)$/;

type LookupFunctions = {
  lookupUser: (userId: string) => string | undefined;
  lookupTeam: (teamId: string) => string | undefined;
  lookupTask: (taskId: string) => string | undefined;
};

// Convert RichText -> HTML (for editing mode)
function richTextToHtml(data: RichText, lookups: LookupFunctions): string {
  let html = data.text;

  data.resources.forEach((entity, i) => {
    const placeholder = `[[${i}]]`;
    let replacement = "";

    switch (entity.type) {
      case "tag":
        const color = getTagColor(entity.tag);
        replacement = `<span data-tag="${entity.tag}" contenteditable="false" class="tag-pill tag-pill-${color}">${entity.tag}</span>`;
        break;
      case "link":
        replacement = `<span data-url="${entity.url}" contenteditable="false" class="smartlink-chip">${entity.display}</span>`;
        break;
      case "user":
        const userName = lookups.lookupUser(entity.userId) || "Unknown User";
        replacement = `<span data-user="${entity.userId}" contenteditable="false" class="mention-person">${userName}</span>`;
        break;
      case "team":
        const teamName = lookups.lookupTeam(entity.teamId) || "Unknown Team";
        replacement = `<span data-team="${entity.teamId}" contenteditable="false" class="mention-person">${teamName}</span>`;
        break;
      case "task":
        const taskTitle = lookups.lookupTask(entity.taskId) || "Unknown Task";
        replacement = `<span data-task="${entity.taskId}" contenteditable="false" class="mention-task">${taskTitle}</span>`;
        break;
    }

    html = html.replace(placeholder, replacement);
  });

  return html;
}

// Convert HTML -> RichText (when onChange fires)
function htmlToRichText(html: string): RichText {
  const entities: Resource[] = [];
  let index = 0;
  let text = html;

  // Replace tags (match data-tag anywhere in the tag)
  text = text.replace(
    /<span\b[^>]*\bdata-tag="([^"]+)"[^>]*>([^<]*)<\/span>/g,
    (_match, tag) => {
      entities.push({ type: "tag", tag });
      return `[[${index++}]]`;
    }
  );

  // Replace links (match data-url anywhere in the tag)
  text = text.replace(
    /<span\b[^>]*\bdata-url="([^"]+)"[^>]*>([^<]*)<\/span>/g,
    (_match, url, display) => {
      entities.push({ type: "link", url, display });
      return `[[${index++}]]`;
    }
  );

  // Replace user mentions (match data-user anywhere in the tag)
  text = text.replace(
    /<span\b[^>]*\bdata-user="([^"]+)"[^>]*>([^<]*)<\/span>/g,
    (_match, userId) => {
      entities.push({ type: "user", userId });
      return `[[${index++}]]`;
    }
  );

  // Replace team mentions (match data-team anywhere in the tag)
  text = text.replace(
    /<span\b[^>]*\bdata-team="([^"]+)"[^>]*>([^<]*)<\/span>/g,
    (_match, teamId) => {
      entities.push({ type: "team", teamId });
      return `[[${index++}]]`;
    }
  );

  // Replace task mentions (match data-task anywhere in the tag)
  text = text.replace(
    /<span\b[^>]*\bdata-task="([^"]+)"[^>]*>([^<]*)<\/span>/g,
    (_match, taskId) => {
      entities.push({ type: "task", taskId });
      return `[[${index++}]]`;
    }
  );

  // Strip any remaining HTML tags and decode entities
  text = text.replace(/<[^>]+>/g, "");
  text = text.replace(/&nbsp;/g, " ");

  return { text, resources: entities };
}

// RichTextDisplay Component - For displaying rich text (view only)
export function RichTextDisplay(props: RichTextDisplayProps) {
  const data = DataContext.use();

  // Create lookup functions
  const lookupUser = (userId: string) => {
    const user = data.mentions.users.find((u) => u.userId === userId);
    return user?.displayName;
  };

  const lookupTeam = (teamId: string) => {
    const team = data.mentions.teams.find((t) => t.id === teamId);
    return team?.name;
  };

  const lookupTask = (taskId: string) => {
    const task = data.mentions.tasks.find((t) => t.taskId === taskId);
    return task?.title;
  };

  const parts = props.value.text.split(/(\[\[\d+\]\])/g);

  const content = parts.map((part, i) => {
    const match = part.match(/\[\[(\d+)\]\]/);

    if (match) {
      const entityIndex = parseInt(match[1]);
      const entity = props.value.resources[entityIndex];

      switch (entity.type) {
        case "tag":
          const color = getTagColor(entity.tag);
          return (
            <span key={i} className={`tag-pill tag-pill-${color}`}>
              {entity.tag}
            </span>
          );

        case "link":
          return (
            <a
              key={i}
              href={entity.url}
              target="_blank"
              rel="noopener noreferrer"
              className="smartlink-anchor"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(entity.url, "_blank");
              }}
            >
              {entity.display}
            </a>
          );

        case "user":
          const userName = lookupUser(entity.userId) || "Unknown User";
          return (
            <span
              key={i}
              className="mention-person"
              onClick={() => props.onUserClick?.(entity.userId)}
              style={{ cursor: props.onUserClick ? "pointer" : "default" }}
            >
              {userName}
            </span>
          );

        case "team":
          const teamName = lookupTeam(entity.teamId) || "Unknown Team";
          return (
            <span
              key={i}
              className="mention-person"
              onClick={() => props.onTeamClick?.(entity.teamId)}
              style={{ cursor: props.onTeamClick ? "pointer" : "default" }}
            >
              {teamName}
            </span>
          );

        case "task":
          const taskTitle = lookupTask(entity.taskId) || "Unknown Task";
          return (
            <span
              key={i}
              className="mention-task"
              onClick={() => props.onTaskClick?.(entity.taskId)}
              style={{ cursor: props.onTaskClick ? "pointer" : "default" }}
            >
              {taskTitle}
            </span>
          );
      }
    }

    return part; // Plain text
  });

  return () => <div className="smartlinks is-view">{content}</div>;
}

// SmartEditor Component - For editing rich text
export function SmartEditor(props: SmartEditorProps) {
  const data = DataContext.use();
  const ref = useRef<HTMLDivElement>();
  let isInitialMount = true;
  let mentioningRange = null as Range | null; // Track if we're in mention mode to prevent premature submit

  // Create lookup functions
  const lookups: LookupFunctions = {
    lookupUser: (userId: string) => {
      const user = data.mentions.users.find((u) => u.userId === userId);
      return user?.displayName;
    },
    lookupTeam: (teamId: string) => {
      const team = data.mentions.teams.find((t) => t.id === teamId);
      return team?.name;
    },
    lookupTask: (taskId: string) => {
      const task = data.mentions.tasks.find((t) => t.taskId === taskId);
      return task?.title;
    },
  };

  const api: SmartEditorApi = {
    clear: () => {
      if (ref.current) {
        ref.current.innerHTML = "";
      }
    },
    focus() {
      ref.current?.focus();
    },
    setValue: (value: RichText) => {
      if (ref.current) {
        ref.current.innerHTML = richTextToHtml(value, lookups);
      }
    },
    getValue: () => {
      return htmlToRichText(ref.current?.innerHTML || "");
    },
    cancelMention: () => {
      mentioningRange = null;
    },
    // Create the insertMention callback
    insertMention: (mention: Mention) => {
      if (!mentioningRange) {
        throw new Error("No reference to a mentioning range");
      }
      // Remove the @query text
      mentioningRange.deleteContents();

      // Create and insert the mention span
      const mentionSpan = makeMentionSpan(mention);
      mentioningRange.insertNode(mentionSpan);

      // Add a space after the mention
      const space = document.createTextNode(" ");
      mentioningRange.setStartAfter(mentionSpan);
      mentioningRange.insertNode(space);

      // Move cursor after the space
      mentioningRange.setStartAfter(space);
      mentioningRange.collapse(true);
      const sel = document.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(mentioningRange);

      ref.current?.focus();

      // Re-enable submit after mention is inserted
      mentioningRange = null;
    },
  };

  if (props.apiRef) {
    // Expose imperative methods
    assignRef(props.apiRef, api);
  }

  // Initialize content only once
  useMountEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.contentEditable = props.disabled ? "false" : "true";

    // Set innerHTML on initial mount
    if (isInitialMount) {
      if (props.initialValue) el.innerHTML = richTextToHtml(props.initialValue, lookups);
      isInitialMount = false;
    }

    // Auto-focus if requested
    if (props.focus && el && !props.disabled) {
      el.focus();
      // Move cursor to end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  // Notify changes (serialize innerHTML to RichText)
  const emitChange = () => {
    if (!props.onSubmit || !ref.current || mentioningRange) return;
    const richText = htmlToRichText(ref.current.innerHTML);
    props.onSubmit(richText);
    api.clear();
  };

  // Handle input to update shadow and check for mentions
  const handleInput = () => {
    updateShadow();
    checkForMention();
  };

  // Check if we're in a mention context and trigger onMention
  function checkForMention() {
    if (!props.onMention) return;

    const wordInfo = getWordBeforeCursor();
    if (!wordInfo) return;

    // Check if the word starts with @
    if (wordInfo.word.startsWith("@")) {
      const { range } = wordInfo;

      // Disable submit while in mention mode
      mentioningRange = range;

      // Call the onMention callback with query and insertMention
      props.onMention(api);
    }
  }

  // Create the non-editable chip node for links
  function makeChip(domain: string, url: string) {
    const chip = document.createElement("span");
    chip.textContent = domain;
    chip.setAttribute("data-url", url);
    chip.setAttribute("contenteditable", "false");
    chip.className = "smartlink-chip";
    return chip;
  }

  // Create the non-editable pill node for tags
  function makeTagPill(tag: string) {
    const pill = document.createElement("span");
    pill.textContent = tag;
    pill.setAttribute("data-tag", tag);
    pill.setAttribute("contenteditable", "false");
    const color = getTagColor(tag);
    pill.className = `tag-pill tag-pill-${color}`;
    return pill;
  }

  // Create mention span for user/team/task
  function makeMentionSpan(mention: Mention) {
    const span = document.createElement("span");
    span.setAttribute("contenteditable", "false");

    switch (mention.type) {
      case "user":
        span.setAttribute("data-user", mention.userId);
        span.textContent = mention.displayName;
        span.className = "mention-person";
        break;
      case "team":
        span.setAttribute("data-team", mention.id);
        span.textContent = mention.name;
        span.className = "mention-person";
        break;
      case "task":
        span.setAttribute("data-task", mention.taskId);
        span.textContent = mention.title;
        span.className = "mention-task";
        break;
    }

    return span;
  }

  // Handle paste to create chip
  const onPaste = (e: Rask.ClipboardEvent<HTMLDivElement>) => {
    if (!e.clipboardData) return;
    const text = e.clipboardData.getData("text/plain").trim();
    const domain = extractDomain(text);
    if (domain && URL_REGEX.test(text)) {
      e.preventDefault();
      const url = text.match(/^https?:\/\//i) ? text : `https://${text}`;
      const chip = makeChip(domain, url);
      insertNodeAtSelection(chip);
      // add a trailing space so you can keep typing naturally
      insertNodeAtSelection(document.createTextNode(" "));
    } else {
      // For plain text paste, prevent default and insert as plain text
      e.preventDefault();
      const plainText = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, plainText);
    }
  };

  // Get the word before the cursor
  function getWordBeforeCursor(): { word: string; range: Range } | null {
    const sel = document.getSelection();
    if (!sel || !sel.anchorNode) return null;

    let node = sel.anchorNode;
    let offset = sel.anchorOffset;

    // If cursor is in an element node, try to get the last text node child
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      // If offset > 0, get the child node before the cursor
      if (offset > 0) {
        const childNode = element.childNodes[offset - 1];
        if (childNode && childNode.nodeType === Node.TEXT_NODE) {
          node = childNode;
          offset = (node.textContent || "").length;
        } else if (childNode && childNode.nodeType === Node.ELEMENT_NODE) {
          // If the previous child is an element (like a pill), get its text content to find last text node
          const lastText = getLastTextNode(childNode);
          if (lastText) {
            node = lastText;
            offset = (node.textContent || "").length;
          }
        }
      } else {
        // If offset is 0, we're at the start, no word before cursor
        return null;
      }
    }

    if (node.nodeType !== Node.TEXT_NODE) return null;

    const text = node.textContent || "";
    const beforeCursor = text.slice(0, offset);

    // Match word starting with #, @, or URL pattern
    const match = beforeCursor.match(/(#\w+|@\w+|\S+)$/);
    if (!match) return null;

    const word = match[0];
    const wordStart = offset - word.length;

    const range = document.createRange();
    range.setStart(node, wordStart);
    range.setEnd(node, offset);

    return { word, range };
  }

  // Helper to get the last text node in a subtree
  function getLastTextNode(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) return node;
    const children = node.childNodes;
    for (let i = children.length - 1; i >= 0; i--) {
      const result = getLastTextNode(children[i]);
      if (result) return result;
    }
    return null;
  }

  // Get best tag suggestion for partial tag input
  function getTagSuggestion(partial: string): string | null {
    if (!partial.startsWith("#") || partial.length < 2) return null;

    const partialTag = partial.slice(1).toLowerCase(); // Remove # and lowercase

    // Find all matching tags
    const matches = props.availableTags?.filter(
      (tag) =>
        tag.toLowerCase().startsWith(partialTag) &&
        tag.toLowerCase() !== partialTag
    );

    if (!matches || matches.length === 0) return null;

    // Count frequency of each tag
    const frequency = new Map<string, number>();
    matches.forEach((tag) => {
      frequency.set(tag, (frequency.get(tag) || 0) + 1);
    });

    // Sort by frequency (descending), then alphabetically
    const sorted = Array.from(new Set(matches)).sort((a, b) => {
      const freqDiff = (frequency.get(b) || 0) - (frequency.get(a) || 0);
      if (freqDiff !== 0) return freqDiff;
      return a.localeCompare(b);
    });

    return sorted[0];
  }

  // Update shadow text based on current input
  function updateShadow() {
    if (!ref.current) return;

    // Remove any existing shadow
    const existingShadow = ref.current.querySelector(".tag-shadow");
    if (existingShadow) {
      existingShadow.remove();
    }

    const sel = document.getSelection();
    if (!sel || !sel.anchorNode) return;

    const wordInfo = getWordBeforeCursor();
    if (!wordInfo || !wordInfo.word.startsWith("#")) {
      return;
    }

    const suggestion = getTagSuggestion(wordInfo.word);
    if (!suggestion) {
      return;
    }

    // Show the remaining part of the suggestion
    const partial = wordInfo.word.slice(1); // Remove #
    const remaining = suggestion.slice(partial.length);

    // Create shadow span
    const shadow = document.createElement("span");
    shadow.className = "tag-shadow";
    shadow.textContent = remaining;
    shadow.contentEditable = "false";
    shadow.style.cssText =
      "color: var(--color-text-tertiary); opacity: 0.5; pointer-events: none; user-select: none;";

    // Insert shadow after cursor
    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(false); // Move to end
    range.insertNode(shadow);

    // Restore cursor position (before the shadow)
    const newRange = document.createRange();
    newRange.setStart(sel.anchorNode, sel.anchorOffset);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }

  // Handle tag and link conversion on space
  const onKeyDown = (e: Rask.KeyboardEvent<HTMLDivElement>) => {
    // Track if we already submitted (e.g., during tag conversion)
    let alreadySubmitted = false;

    // Handle Tab for autocomplete BEFORE external handler
    if (e.key === "Tab") {
      const wordInfo = getWordBeforeCursor();
      if (wordInfo && wordInfo.word.startsWith("#")) {
        const suggestion = getTagSuggestion(wordInfo.word);
        if (suggestion) {
          e.preventDefault();
          e.stopPropagation();

          // Remove shadow first
          const existingShadow = ref.current?.querySelector(".tag-shadow");
          if (existingShadow) {
            existingShadow.remove();
          }

          // Replace the partial tag with the full suggestion and convert to pill
          const { range } = wordInfo;
          range.deleteContents();

          // Create pill with the full suggestion
          const pill = makeTagPill(suggestion);
          range.insertNode(pill);

          // Add space after pill
          const space = document.createTextNode(" ");
          range.setStartAfter(pill);
          range.insertNode(space);

          // Move cursor after space
          range.setStartAfter(space);
          range.collapse(true);
          const sel = document.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);

          return;
        } else {
          // If typing a tag but no suggestion, still prevent default tab
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
    }

    // Handle tag and link conversion on space/enter BEFORE calling external handler
    if (e.key === " " || (e.key === "Enter" && !e.shiftKey)) {
      // Remove shadow first
      const existingShadow = ref.current?.querySelector(".tag-shadow");
      if (existingShadow) {
        existingShadow.remove();
      }

      const wordInfo = getWordBeforeCursor();
      if (wordInfo) {
        const { word, range } = wordInfo;

        // Check if it's a tag
        const tagMatch = word.match(TAG_REGEX);
        if (tagMatch) {
          const tag = tagMatch[1]; // Extract tag without #
          range.deleteContents();
          const pill = makeTagPill(tag);
          range.insertNode(pill);

          // If Enter was pressed, don't add space - let the Enter key proceed normally
          // to trigger the external onKeyDown handler (which likely saves the todo)
          if (e.key === "Enter") {
            // Move cursor after pill
            range.setStartAfter(pill);
            range.collapse(true);
            const sel = document.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
            emitChange();
            alreadySubmitted = true;
            // Don't prevent default - let Enter propagate to external handler
            // Fall through to call external handler below
          } else {
            // For space, add space after pill
            e.preventDefault();
            const space = document.createTextNode(" ");
            range.setStartAfter(pill);
            range.insertNode(space);

            // Move cursor after space
            range.setStartAfter(space);
            range.collapse(true);
            const sel = document.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);

            return;
          }
        }
      }
    }

    // Submit on Enter if not already submitted and onSubmit is provided
    if (e.key === "Enter" && !e.shiftKey) {
      if (props.onSubmit && !alreadySubmitted) {
        e.preventDefault();
        emitChange();
        return; // Don't call external handler for Enter - it's handled by onSubmit
      }
      // If no onSubmit, allow default behavior (new line)
    }

    // Call external handler if provided (but not for Enter)
    if (props.onKeyDown) {
      props.onKeyDown(e);
      if (e.defaultPrevented) return;
    }

    if (e.key === "Backspace") {
      const sel = document.getSelection();
      if (!sel || !sel.anchorNode) return;

      // If caret is right after a chip or tag pill, remove it
      let node: Node | null = sel.anchorNode;
      let offset = sel.anchorOffset;

      // If inside a text node and at start, move to previous sibling
      if (node.nodeType === Node.TEXT_NODE && offset === 0) {
        node = node.previousSibling;
        if (
          node &&
          (node as HTMLElement).dataset &&
          ((node as HTMLElement).dataset.url ||
            (node as HTMLElement).dataset.tag)
        ) {
          e.preventDefault();
          (node as HTMLElement).remove();
        }
        return;
      }

      // If in container element, check previous child
      if (node.nodeType === Node.ELEMENT_NODE) {
        const container = node as Element;
        const children = Array.from(container.childNodes);
        const prevNode = children[offset - 1];
        if (
          prevNode &&
          (prevNode as HTMLElement).dataset &&
          ((prevNode as HTMLElement).dataset.url ||
            (prevNode as HTMLElement).dataset.tag)
        ) {
          e.preventDefault();
          prevNode.remove();
        }
      }
    }
  };

  const handleBlur = (e: Rask.FocusEvent) => {
    // Don't trigger blur handler if the entire window/document lost focus
    // (user switched to another app). Only blur when clicking within the app.
    if (mentioningRange || !document.hasFocus()) {
      e.preventDefault();
      return;
    }

    emitChange(); // Submit on blur
    if (props.onBlur) {
      props.onBlur();
    }
  };

  return () => (
    <div
      ref={ref}
      className={`smartlinks is-editing ${props.disabled ? "is-disabled" : ""} ${props.className || ""}`}
      onPaste={onPaste}
      onInput={handleInput}
      onKeyDown={onKeyDown}
      onBlur={handleBlur}
      data-placeholder={props.placeholder}
    />
  );
}

function extractDomain(url: string): string | null {
  try {
    const withScheme = url.match(/^https?:\/\//i) ? url : `https://${url}`;
    const u = new URL(withScheme);
    return u.host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// A small helper to insert a node at current selection
function insertNodeAtSelection(node: Node) {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(node);
  // place caret after the node
  range.setStartAfter(node);
  range.setEndAfter(node);
  sel.removeAllRanges();
  sel.addRange(range);
}

// Hash function to deterministically assign color to tag
export function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "gray",
    "red",
    "yellow",
    "green",
    "blue",
    "indigo",
    "purple",
    "pink",
  ];
  return colors[Math.abs(hash) % colors.length];
}
