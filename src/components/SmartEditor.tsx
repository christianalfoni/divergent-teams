import { assignRef, useMountEffect, useRef, type Ref } from "rask-ui";

// Entity types
export type Resource =
  | { type: "tag"; tag: string }
  | { type: "user"; userId: string; display: string }
  | { type: "project"; projectId: string; display: string }
  | { type: "issue"; issueId: string; display: string }
  | { type: "link"; url: string; display: string };

// Rich text structure
export type RichText = {
  text: string; // Contains [[0]], [[1]], etc.
  resources: Resource[];
};

type SmartEditorProps = {
  initialValue?: RichText;
  apiRef?: Ref<SmartEditorRef>;
  onSubmit?: (value: RichText) => void;
  placeholder?: string;
  focus?: boolean;
  onKeyDown?: (e: Rask.KeyboardEvent<HTMLDivElement>) => void;
  onBlur?: () => void;
  availableTags?: string[]; // List of all tag texts from other todos for autocomplete
  onMention?: (
    query: string,
    insertMention: (
      entity: Extract<Resource, { type: "user" | "project" | "issue" }>
    ) => void
  ) => void;
};

type RichTextDisplayProps = {
  value: RichText;
  onUserClick?: (userId: string) => void;
  onProjectClick?: (projectId: string) => void;
  onIssueClick?: (issueId: string) => void;
};

export type SmartEditorRef = {
  clear: () => void;
  setValue: (value: RichText) => void;
  getValue: () => RichText;
};

const URL_REGEX = /^(https?:\/\/)?([\w.-]+)(:\d+)?(\/[^\s]*)?$/i;
const TAG_REGEX = /^#(\w+)$/;

// Convert RichText -> HTML (for editing mode)
function richTextToHtml(data: RichText): string {
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
        replacement = `<span data-user="${entity.userId}" contenteditable="false" class="mention-person">@${entity.display}</span>`;
        break;
      case "project":
        replacement = `<span data-project="${entity.projectId}" contenteditable="false" class="mention-project">${entity.display}</span>`;
        break;
      case "issue":
        replacement = `<span data-issue="${entity.issueId}" contenteditable="false" class="mention-issue">#${entity.display}</span>`;
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

  // Replace tags
  text = text.replace(
    /<span data-tag="([^"]+)"[^>]*>([^<]*)<\/span>/g,
    (match, tag) => {
      entities.push({ type: "tag", tag });
      return `[[${index++}]]`;
    }
  );

  // Replace links
  text = text.replace(
    /<span data-url="([^"]+)"[^>]*>([^<]*)<\/span>/g,
    (match, url, display) => {
      entities.push({ type: "link", url, display });
      return `[[${index++}]]`;
    }
  );

  // Replace user mentions
  text = text.replace(
    /<span data-user="([^"]+)"[^>]*>@([^<]*)<\/span>/g,
    (match, userId, display) => {
      entities.push({ type: "user", userId, display });
      return `[[${index++}]]`;
    }
  );

  // Replace project mentions
  text = text.replace(
    /<span data-project="([^"]+)"[^>]*>([^<]*)<\/span>/g,
    (match, projectId, display) => {
      entities.push({ type: "project", projectId, display });
      return `[[${index++}]]`;
    }
  );

  // Replace issue mentions
  text = text.replace(
    /<span data-issue="([^"]+)"[^>]*>#([^<]*)<\/span>/g,
    (match, issueId, display) => {
      entities.push({ type: "issue", issueId, display });
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
          return (
            <span
              key={i}
              className="mention-person"
              onClick={() => props.onUserClick?.(entity.userId)}
              style={{ cursor: props.onUserClick ? "pointer" : "default" }}
            >
              @{entity.display}
            </span>
          );

        case "project":
          return (
            <span
              key={i}
              className="mention-project"
              onClick={() => props.onProjectClick?.(entity.projectId)}
              style={{ cursor: props.onProjectClick ? "pointer" : "default" }}
            >
              {entity.display}
            </span>
          );

        case "issue":
          return (
            <span
              key={i}
              className="mention-issue"
              onClick={() => props.onIssueClick?.(entity.issueId)}
              style={{ cursor: props.onIssueClick ? "pointer" : "default" }}
            >
              #{entity.display}
            </span>
          );
      }
    }

    return part; // Plain text
  });

  return () => (
    <div className="smartlinks is-view">
      {content}
    </div>
  );
}

// SmartEditor Component - For editing rich text
export function SmartEditor(props: SmartEditorProps) {
  const ref = useRef<HTMLDivElement>();
  let isInitialMount = true;

  if (props.apiRef) {
    // Expose imperative methods
    assignRef(props.apiRef, {
      clear: () => {
        if (ref.current) {
          ref.current.innerHTML = "";
        }
      },
      setValue: (value: RichText) => {
        if (ref.current) {
          ref.current.innerHTML = richTextToHtml(value);
        }
      },
      getValue: () => {
        return htmlToRichText(ref.current?.innerHTML || "");
      },
    });
  }

  // Initialize content only once
  useMountEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.contentEditable = "true";

    // Set innerHTML on initial mount
    if (isInitialMount) {
      if (props.initialValue) el.innerHTML = richTextToHtml(props.initialValue);
      isInitialMount = false;
    }

    // Auto-focus if requested
    if (props.focus && el) {
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
    if (!props.onSubmit || !ref.current) return;
    const richText = htmlToRichText(ref.current.innerHTML);
    props.onSubmit(richText);
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
      const query = wordInfo.word.slice(1); // Remove the @
      const { range } = wordInfo;

      // Create the insertMention callback
      const insertMention = (
        entity: Extract<Resource, { type: "user" | "project" | "issue" }>
      ) => {
        // Remove the @query text
        range.deleteContents();

        // Create and insert the mention span
        const mentionSpan = makeMentionSpan(entity);
        range.insertNode(mentionSpan);

        // Add a space after the mention
        const space = document.createTextNode(" ");
        range.setStartAfter(mentionSpan);
        range.insertNode(space);

        // Move cursor after the space
        range.setStartAfter(space);
        range.collapse(true);
        const sel = document.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      };

      // Call the onMention callback with query and insertMention
      props.onMention(query, insertMention);
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

  // Create mention span for user/project/issue
  function makeMentionSpan(
    entity: Extract<Resource, { type: "user" | "project" | "issue" }>
  ) {
    const span = document.createElement("span");
    span.setAttribute("contenteditable", "false");

    switch (entity.type) {
      case "user":
        span.setAttribute("data-user", entity.userId);
        span.textContent = `@${entity.display}`;
        span.className = "mention-person";
        break;
      case "project":
        span.setAttribute("data-project", entity.projectId);
        span.textContent = entity.display;
        span.className = "mention-project";
        break;
      case "issue":
        span.setAttribute("data-issue", entity.issueId);
        span.textContent = `#${entity.display}`;
        span.className = "mention-issue";
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

    // Submit on Enter if not already submitted
    if (e.key === "Enter" && !e.shiftKey) {
      if (!alreadySubmitted) {
        emitChange();
      }
      return; // Don't call external handler for Enter - it's handled by onSubmit
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

  const handleBlur = () => {
    // Don't trigger blur handler if the entire window/document lost focus
    // (user switched to another app). Only blur when clicking within the app.
    if (!document.hasFocus()) {
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
      className="smartlinks is-editing"
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
