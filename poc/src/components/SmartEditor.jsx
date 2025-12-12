import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
} from "react";

const URL_REGEX = /^(https?:\/\/)?([\w.-]+)(:\d+)?(\/[^\s]*)?$/i;
const TAG_REGEX = /^#(\w+)$/;
const PERSON_MENTION_REGEX = /^@([\w-]+)$/;
const PROJECT_MENTION_REGEX = /^\+([\w-]+)$/;
const ISSUE_MENTION_REGEX = /^#(\d+)$/;

function extractDomain(url) {
  try {
    const withScheme = url.match(/^https?:\/\//i) ? url : `https://${url}`;
    const u = new URL(withScheme);
    return u.host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// A small helper to insert a node at current selection
function insertNodeAtSelection(node) {
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

const SmartEditor = forwardRef(function SmartEditor(
  {
    html,
    editing,
    onChange,
    placeholder = "Description...",
    autoFocus = false,
    onKeyDown: externalOnKeyDown,
    onBlur: externalOnBlur,
    availableTags = [],
  },
  forwardedRef
) {
  const ref = useRef(null);
  const isInitialMount = useRef(true);
  const [copiedLinkId, setCopiedLinkId] = useState(null);

  // Expose imperative methods
  useImperativeHandle(forwardedRef, () => ({
    clear: () => {
      if (ref.current) {
        ref.current.innerHTML = "";
      }
    },
    setHtml: (html) => {
      if (ref.current) {
        ref.current.innerHTML = html;
      }
    },
    getHtml: () => {
      return ref.current?.innerHTML || "";
    },
    convertPendingTags: () => {
      if (!ref.current) return;

      // Remove any existing shadow first
      const existingShadow = ref.current.querySelector(".tag-shadow");
      if (existingShadow) {
        existingShadow.remove();
      }

      // Get the word before the cursor
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

          // Move cursor after pill
          range.setStartAfter(pill);
          range.collapse(true);
          const sel = document.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);

          emitChange();
        }
      }
    },
  }));

  // Initialize content only once or when explicitly changing modes
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.contentEditable = editing ? "true" : "false";

    // Only set innerHTML on initial mount
    if (isInitialMount.current) {
      if (html) el.innerHTML = html;
      isInitialMount.current = false;
      // Don't return - continue to do chip-to-anchor conversion on initial mount
    } else {
      // Update innerHTML when html prop changes - but ONLY when not editing
      // to avoid cursor jumping during editing
      if (!editing && html !== undefined && el.innerHTML !== html) {
        el.innerHTML = html;
      }
    }

    // When switching to view mode, swap chip spans -> anchors
    if (!editing) {
      // Convert chip spans to anchors (purely visual; you might store both separately if needed)
      el.querySelectorAll("span[data-url]").forEach((chip, index) => {
        const url = chip.dataset.url;
        const domain = chip.textContent || url;
        const linkId = `link-${Date.now()}-${index}`;
        const a = document.createElement("a");
        a.href = url;
        a.textContent = domain;
        a.rel = "noopener noreferrer";
        a.target = "_blank";
        a.className = "smartlink-anchor";
        a.dataset.linkId = linkId;
        a.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Use Electron's shell.openExternal if available, otherwise use default behavior
          if (window.native?.openExternal) {
            window.native.openExternal(url);
          } else {
            window.open(url, "_blank");
          }
        });
        a.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          e.stopPropagation();
          navigator.clipboard.writeText(url);
          setCopiedLinkId(linkId);
          setTimeout(() => {
            setCopiedLinkId(null);
          }, 1000);
        });
        chip.replaceWith(a);
      });
    } else {
      // Convert anchors back to chips on entering edit mode
      el.querySelectorAll("a.smartlink-anchor").forEach((a) => {
        const url = a.href;
        const domain = a.textContent || url;
        const chip = makeChip(domain, url);
        a.replaceWith(chip);
      });
    }

    // Auto-focus if requested
    if (autoFocus && editing && el) {
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
  }, [
    // Conditionally depend on html: only when NOT editing to prevent cursor jumping.
    // When editing=true, changes to html won't trigger this effect, avoiding innerHTML updates.
    // When editing=false (view mode), html changes will trigger the effect to update display.
    editing ? null : html,
    editing,
    autoFocus,
  ]);

  // Notify changes (serialize innerHTML while editing)
  const emitChange = () => {
    if (!editing || !onChange || !ref.current) return;
    onChange(ref.current.innerHTML);
  };

  // Handle input to update shadow
  const handleInput = () => {
    emitChange();
    updateShadow();
  };

  // Create the non-editable chip node for links
  function makeChip(domain, url) {
    const chip = document.createElement("span");
    chip.textContent = domain;
    chip.setAttribute("data-url", url);
    chip.setAttribute("contenteditable", "false");
    chip.className = "smartlink-chip";
    return chip;
  }

  // Create the non-editable pill node for tags
  function makeTagPill(tag) {
    const pill = document.createElement("span");
    pill.textContent = tag;
    pill.setAttribute("data-tag", tag);
    pill.setAttribute("contenteditable", "false");
    const color = getTagColor(tag);
    pill.className = `tag-pill tag-pill-${color}`;
    return pill;
  }

  // Create the non-editable pill node for person mentions
  function makePersonMentionPill(name) {
    const pill = document.createElement("span");
    pill.innerHTML = `<svg class="mention-icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>${name}`;
    pill.setAttribute("data-mention", "person");
    pill.setAttribute("data-name", name);
    pill.setAttribute("contenteditable", "false");
    pill.className = "mention-pill mention-person";
    return pill;
  }

  // Create the non-editable pill node for project mentions
  function makeProjectMentionPill(name) {
    const pill = document.createElement("span");
    pill.innerHTML = `<svg class="mention-icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>${name}`;
    pill.setAttribute("data-mention", "project");
    pill.setAttribute("data-name", name);
    pill.setAttribute("contenteditable", "false");
    pill.className = "mention-pill mention-project";
    return pill;
  }

  // Create the non-editable pill node for issue mentions
  function makeIssueMentionPill(number) {
    const pill = document.createElement("span");
    pill.innerHTML = `<svg class="mention-icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0 1 12 12.75Zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 0 1-1.152 6.06M12 12.75c-2.883 0-5.647.508-8.208 1.44.125 2.104.52 4.136 1.153 6.06M12 12.75a2.25 2.25 0 0 0 2.248-2.354M12 12.75a2.25 2.25 0 0 1-2.248-2.354M12 8.25c.995 0 1.971-.08 2.922-.236.403-.066.74-.358.795-.762a3.778 3.778 0 0 0-.399-2.25M12 8.25c-.995 0-1.97-.08-2.922-.236-.402-.066-.74-.358-.795-.762a3.734 3.734 0 0 1 .4-2.253M12 8.25a2.25 2.25 0 0 0-2.248 2.146M12 8.25a2.25 2.25 0 0 1 2.248 2.146M8.683 5a6.032 6.032 0 0 1-1.155-1.002c.07-.63.27-1.222.574-1.747m.581 2.749A3.75 3.75 0 0 1 15.318 5m0 0c.427-.283.815-.62 1.155-.999a4.471 4.471 0 0 0-.575-1.752M4.921 6a24.048 24.048 0 0 0-.392 3.314c1.668.546 3.416.914 5.223 1.082M19.08 6c.205 1.08.337 2.187.392 3.314a23.882 23.882 0 0 1-5.223 1.082" /></svg>#${number}`;
    pill.setAttribute("data-mention", "issue");
    pill.setAttribute("data-issue", number);
    pill.setAttribute("contenteditable", "false");
    pill.className = "mention-pill mention-issue";
    return pill;
  }

  // Handle paste to create chip
  const onPaste = (e) => {
    if (!editing) return;
    const text = e.clipboardData.getData("text/plain").trim();
    const domain = extractDomain(text);
    if (domain && URL_REGEX.test(text)) {
      e.preventDefault();
      const url = text.match(/^https?:\/\//i) ? text : `https://${text}`;
      const chip = makeChip(domain, url);
      insertNodeAtSelection(chip);
      // add a trailing space so you can keep typing naturally
      insertNodeAtSelection(document.createTextNode(" "));
      emitChange();
    } else {
      // For plain text paste, prevent default and insert as plain text
      e.preventDefault();
      const plainText = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, plainText);
    }
  };

  // Get the word before the cursor
  function getWordBeforeCursor() {
    const sel = document.getSelection();
    if (!sel || !sel.anchorNode) return null;

    let node = sel.anchorNode;
    let offset = sel.anchorOffset;

    // If cursor is in an element node, try to get the last text node child
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node;
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

    // Match word starting with @, +, # or URL pattern
    const match = beforeCursor.match(/(@[\w-]+|\+[\w-]+|#\w+|\S+)$/);
    if (!match) return null;

    const word = match[0];
    const wordStart = offset - word.length;

    const range = document.createRange();
    range.setStart(node, wordStart);
    range.setEnd(node, offset);

    return { word, range };
  }

  // Helper to get the last text node in a subtree
  function getLastTextNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return node;
    const children = node.childNodes;
    for (let i = children.length - 1; i >= 0; i--) {
      const result = getLastTextNode(children[i]);
      if (result) return result;
    }
    return null;
  }

  // Get best tag suggestion for partial tag input
  function getTagSuggestion(partial) {
    if (!partial.startsWith("#") || partial.length < 2) return null;

    const partialTag = partial.slice(1).toLowerCase(); // Remove # and lowercase

    // Find all matching tags
    const matches = availableTags.filter(
      (tag) =>
        tag.toLowerCase().startsWith(partialTag) &&
        tag.toLowerCase() !== partialTag
    );

    if (matches.length === 0) return null;

    // Count frequency of each tag
    const frequency = new Map();
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
    if (!editing || !ref.current) return;

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
  const onKeyDown = (e) => {
    if (!editing) return;

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

          emitChange();
          return;
        } else {
          // If typing a tag but no suggestion, still prevent default tab
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
    }

    // Handle mention and tag conversion on space/enter BEFORE calling external handler
    if (e.key === " " || (e.key === "Enter" && !e.shiftKey)) {
      // Remove shadow first
      const existingShadow = ref.current?.querySelector(".tag-shadow");
      if (existingShadow) {
        existingShadow.remove();
      }

      const wordInfo = getWordBeforeCursor();
      if (wordInfo) {
        const { word, range } = wordInfo;

        let pill = null;

        // Check if it's a person mention (@name)
        const personMatch = word.match(PERSON_MENTION_REGEX);
        if (personMatch) {
          const name = personMatch[1];
          pill = makePersonMentionPill(name);
        }

        // Check if it's a project mention (+name)
        const projectMatch = word.match(PROJECT_MENTION_REGEX);
        if (projectMatch) {
          const name = projectMatch[1];
          pill = makeProjectMentionPill(name);
        }

        // Check if it's an issue mention (#123)
        const issueMatch = word.match(ISSUE_MENTION_REGEX);
        if (issueMatch) {
          const number = issueMatch[1];
          pill = makeIssueMentionPill(number);
        }

        // Check if it's a tag (#word)
        const tagMatch = word.match(TAG_REGEX);
        if (tagMatch && !issueMatch) { // Only match if not already matched as issue
          const tag = tagMatch[1];
          pill = makeTagPill(tag);
        }

        if (pill) {
          range.deleteContents();
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

            emitChange();
            return;
          }
        }
      }
    }

    // Call external handler if provided
    if (externalOnKeyDown) {
      externalOnKeyDown(e);
      if (e.defaultPrevented) return;
    }

    if (e.key === "Backspace") {
      const sel = document.getSelection();
      if (!sel || !sel.anchorNode) return;

      // If caret is right after a chip or tag pill, remove it
      let node = sel.anchorNode;
      let offset = sel.anchorOffset;

      // If inside a text node and at start, move to previous sibling
      if (node.nodeType === Node.TEXT_NODE && offset === 0) {
        node = node.previousSibling;
        if (
          node &&
          node.dataset &&
          (node.dataset.url || node.dataset.tag || node.dataset.mention)
        ) {
          e.preventDefault();
          node.remove();
          emitChange();
        }
        return;
      }

      // If in container element, check previous child
      if (node.nodeType === Node.ELEMENT_NODE) {
        const container = node;
        const children = Array.from(container.childNodes);
        const prevNode = children[offset - 1];
        if (
          prevNode &&
          prevNode.dataset &&
          (prevNode.dataset.url || prevNode.dataset.tag || prevNode.dataset.mention)
        ) {
          e.preventDefault();
          prevNode.remove();
          emitChange();
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

    if (externalOnBlur) {
      externalOnBlur();
    }
  };

  // Add the copied class to the link when it's copied
  useEffect(() => {
    if (!ref.current || !copiedLinkId) return;

    const link = ref.current.querySelector(`[data-link-id="${copiedLinkId}"]`);
    if (link) {
      link.classList.add("link-copied");
    }

    return () => {
      if (link) {
        link.classList.remove("link-copied");
      }
    };
  }, [copiedLinkId]);

  return (
    <>
      <div
        ref={ref}
        className={`smartlinks ${editing ? "is-editing" : "is-view"}`}
        onPaste={onPaste}
        onInput={handleInput}
        onKeyDown={onKeyDown}
        onBlur={handleBlur}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        style={{
          outline: "none",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: "var(--todo-text-size)",
        }}
      />
      <style>{`
        .smartlink-chip {
          display: inline-flex;
          align-items: center;
          padding: 0px 6px;
          border-radius: 6px;
          border: 1px solid var(--color-border-secondary);
          background: var(--color-bg-hover);
          line-height: 1.4;
          margin: 0 1px;
          user-select: none;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--color-accent-text);
        }
        .smartlink-chip::after {
          content: "↗";
          font-size: 0.8em;
          margin-left: 4px;
          opacity: 0.6;
        }
        .tag-pill {
          position: relative;
          top: -1px;
          display: inline-flex;
          align-items: center;
          padding: 0px 6px;
          border-radius: 6px;
          line-height: 1.4;
          margin: 0 1px;
          user-select: none;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .line-through .tag-pill {
          text-decoration: line-through;
        }
        .mention-pill {
          position: relative;
          top: -1px;
          display: inline-flex;
          align-items: center;
          gap: 2px;
          padding: 0px 6px;
          border-radius: 6px;
          line-height: 1.4;
          margin: 0 1px;
          user-select: none;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .mention-icon {
          width: 0.75rem;
          height: 0.75rem;
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
        }
        .mention-person {
          background: rgb(219 234 254);
          color: rgb(29 78 216);
        }
        .mention-project {
          background: rgb(220 252 231);
          color: rgb(21 128 61);
        }
        .mention-issue {
          background: rgb(254 226 226);
          color: rgb(185 28 28);
        }
        .line-through .mention-pill {
          text-decoration: line-through;
        }
        @media (prefers-color-scheme: dark) {
          .mention-person {
            background: rgb(96 165 250 / 0.1);
            color: rgb(96 165 250);
          }
          .mention-project {
            background: rgb(74 222 128 / 0.1);
            color: rgb(74 222 128);
          }
          .mention-issue {
            background: rgb(248 113 113 / 0.1);
            color: rgb(248 113 113);
          }
        }
        .tag-pill-gray {
          background: rgb(243 244 246);
          color: rgb(75 85 99);
        }
        .tag-pill-red {
          background: rgb(254 226 226);
          color: rgb(185 28 28);
        }
        .tag-pill-yellow {
          background: rgb(254 249 195);
          color: rgb(133 77 14);
        }
        .tag-pill-green {
          background: rgb(220 252 231);
          color: rgb(21 128 61);
        }
        .tag-pill-blue {
          background: rgb(219 234 254);
          color: rgb(29 78 216);
        }
        .tag-pill-indigo {
          background: rgb(224 231 255);
          color: rgb(67 56 202);
        }
        .tag-pill-purple {
          background: rgb(243 232 255);
          color: rgb(126 34 206);
        }
        .tag-pill-pink {
          background: rgb(252 231 243);
          color: rgb(190 24 93);
        }
        @media (prefers-color-scheme: dark) {
          .tag-pill-gray {
            background: rgb(156 163 175 / 0.1);
            color: rgb(156 163 175);
          }
          .tag-pill-red {
            background: rgb(248 113 113 / 0.1);
            color: rgb(248 113 113);
          }
          .tag-pill-yellow {
            background: rgb(234 179 8 / 0.1);
            color: rgb(234 179 8);
          }
          .tag-pill-green {
            background: rgb(74 222 128 / 0.1);
            color: rgb(74 222 128);
          }
          .tag-pill-blue {
            background: rgb(96 165 250 / 0.1);
            color: rgb(96 165 250);
          }
          .tag-pill-indigo {
            background: rgb(129 140 248 / 0.1);
            color: rgb(129 140 248);
          }
          .tag-pill-purple {
            background: rgb(192 132 252 / 0.1);
            color: rgb(192 132 252);
          }
          .tag-pill-pink {
            background: rgb(244 114 182 / 0.1);
            color: rgb(244 114 182);
          }
        }
        .smartlink-anchor {
          color: var(--color-accent-text);
          text-decoration: underline;
          cursor: pointer;
          position: relative;
        }
        .smartlink-anchor:hover {
          color: var(--color-accent-text-hover);
        }
        .smartlinks.is-editing .smartlink-anchor {
          pointer-events: none;
        }
        .smartlink-anchor.link-copied {
          color: transparent;
          text-decoration: none;
        }
        .smartlink-anchor.link-copied::after {
          content: "copied!";
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-accent-text);
          text-decoration: none;
        }
      `}</style>
    </>
  );
});

// Hash function to deterministically assign color to tag
export function getTagColor(tag) {
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

export default SmartEditor;
