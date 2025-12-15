# Smart Editor to TipTap Migration Plan

## Executive Summary

This document outlines a migration strategy from the current custom Smart Editor implementation to TipTap, a headless rich-text editor framework built on ProseMirror. The migration will preserve all existing functionality while establishing a foundation for future enhancements including lists, images, and syntax highlighting.

**Current Implementation**: Custom contenteditable-based editor (766 lines) with tags, links, user mentions, and autocomplete.

**Target Implementation**: TipTap-based editor with custom extensions maintaining feature parity and enabling extensibility.

---

## Current Smart Editor Analysis

### Core Features

| Feature | Implementation | Complexity |
|---------|---------------|------------|
| **Tag System** (`#tag`) | Custom parsing, 8 color themes, frequency-based autocomplete | High |
| **Links** | Paste detection, domain extraction, chip UI | Medium |
| **User Mentions** (`@user`) | Range tracking, external palette integration, insertMention API | High |
| **RichText Data Structure** | `{ text: "...", resources: [...] }` with placeholder references (`[[0]]`, `[[1]]`) | High |
| **Autocomplete** | Tab completion, shadow text preview | Medium |
| **Non-editable Elements** | `contenteditable="false"` spans with data attributes | Medium |
| **Imperative API** | `setValue()`, `getValue()`, `clear()`, `insertMention()`, `cancelMention()` | Medium |

### Technical Characteristics

- **Direct DOM Manipulation**: Uses native contenteditable with Selection/Range API
- **Rask UI Integration**: Two-scope pattern with reactive state
- **Custom Serialization**: Bidirectional conversion (RichText ↔ HTML)
- **Zero Dependencies**: Pure implementation with no external libraries
- **Styling**: Comprehensive CSS with dark mode support

### Usage Locations

- `TodoItem.tsx` - Task description editing
- `Calendar.tsx` - New todo creation
- `TodoConversation.tsx` - Message composition with mentions

---

## TipTap Overview

### Architecture

**Foundation**: Built on ProseMirror, providing:
- Schema-based document structure
- Transaction-based state management
- Plugin system for extensibility
- Collaborative editing capabilities

**Key Concepts**:
- **Nodes**: Block-level content (paragraphs, headings, code blocks)
- **Marks**: Inline formatting (bold, italic, highlights)
- **Extensions**: Functionality modules (mentions, commands, drag handles)

### Advantages for Migration

1. **Modular Design**: Add only needed extensions, keep bundle small
2. **Framework-Agnostic Core**: Pure JavaScript, no framework dependencies
3. **Direct DOM Manipulation**: TipTap handles its own rendering, perfect for Rask
4. **Rich Extension Ecosystem**: Pre-built solutions for common features
5. **Customization**: Create custom nodes/marks for unique requirements
6. **Maintainability**: Battle-tested foundation vs. maintaining custom implementation
7. **Future-Ready**: Built-in support for collaboration, markdown, AI integration

### Installation

```bash
npm install @tiptap/core @tiptap/starter-kit
```

**Note**: We're using `@tiptap/core` (vanilla JS) instead of `@tiptap/react` since Rask handles its own rendering and TipTap's DOM manipulation is completely independent of any framework.

**Starter Kit Includes**:
- Document, Paragraph, Text (base structure)
- Bold, Italic, Code (marks)
- Heading, Blockquote, CodeBlock (nodes)
- History (undo/redo)
- Dropcursor, Gapcursor (UX improvements)

---

## Migration Strategy

### Phase 1: Foundation Setup (Maintain Dual Implementation)

**Goal**: Establish TipTap alongside existing editor without breaking changes.

**Tasks**:
1. Install TipTap dependencies
2. Create `TipTapEditor.tsx` component (parallel to SmartEditor)
3. Implement basic Rask UI wrapper with two-scope pattern
4. Set up minimal configuration with StarterKit
5. Add development flag to toggle between implementations

**Duration**: Foundation work
**Risk**: Low - no production changes

---

### Phase 2: Core Feature Migration

**Goal**: Achieve feature parity with current Smart Editor.

#### 2.1 Custom Tag Extension

**Implementation Approach**:
- Create custom **Node** extension: `Tag`
- Store tag text and color in node attributes
- Render as non-editable pill with color classes
- Input rule: Convert `#tagname ` → Tag node

```typescript
const TagExtension = Node.create({
  name: 'tag',
  group: 'inline',
  inline: true,
  atom: true, // Non-editable

  addAttributes() {
    return {
      tag: { default: null },
      color: { default: 'gray' }
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="tag"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['span', {
      ...HTMLAttributes,
      'data-type': 'tag',
      class: `tag-pill tag-pill-${node.attrs.color}`,
      contenteditable: 'false'
    }, `#${node.attrs.tag}`]
  },

  addInputRules() {
    return [
      // Convert #tag followed by space
      nodeInputRule({
        find: /#(\w+)\s$/,
        type: this.type,
        getAttributes: (match) => ({
          tag: match[1],
          color: getTagColor(match[1]) // Reuse existing hash function
        })
      })
    ]
  }
})
```

**Tag Autocomplete with Shadow Text**:

Instead of using TipTap's Suggestion plugin (which shows dropdowns), we'll implement the shadow text pattern you currently have. This is done with a custom ProseMirror plugin:

```typescript
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const TagShadowPlugin = (availableTags: string[]) => {
  return new Plugin({
    key: new PluginKey('tagShadow'),

    state: {
      init() {
        return DecorationSet.empty
      },

      apply(tr, oldState) {
        // Get cursor position
        const { $from } = tr.selection
        const textBefore = $from.nodeBefore?.text || ''

        // Check if we're typing a tag
        const match = textBefore.match(/#(\w+)$/)
        if (!match) {
          return DecorationSet.empty
        }

        const partial = match[1]
        const suggestion = getTagSuggestion(partial, availableTags)

        if (!suggestion || partial === suggestion) {
          return DecorationSet.empty
        }

        // Create shadow text decoration
        const completion = suggestion.slice(partial.length)
        const decoration = Decoration.widget(
          $from.pos,
          () => {
            const span = document.createElement('span')
            span.className = 'tag-shadow'
            span.textContent = completion
            span.style.opacity = '0.4'
            span.style.pointerEvents = 'none'
            return span
          },
          { side: 1 }
        )

        return DecorationSet.create(tr.doc, [decoration])
      }
    },

    props: {
      decorations(state) {
        return this.getState(state)
      },

      handleKeyDown(view, event) {
        // Handle Tab to accept suggestion
        if (event.key === 'Tab') {
          const { $from } = view.state.selection
          const textBefore = $from.nodeBefore?.text || ''
          const match = textBefore.match(/#(\w+)$/)

          if (match) {
            const partial = match[1]
            const suggestion = getTagSuggestion(partial, availableTags)

            if (suggestion && partial !== suggestion) {
              event.preventDefault()

              // Complete the tag
              const completion = suggestion.slice(partial.length)
              view.dispatch(
                view.state.tr.insertText(completion + ' ')
              )

              return true
            }
          }
        }

        return false
      }
    }
  })
}

// Reuse your existing tag suggestion logic
function getTagSuggestion(partial: string, availableTags: string[]): string | null {
  // Your existing frequency-based sorting logic
  const matches = availableTags
    .filter(tag => tag.toLowerCase().startsWith(partial.toLowerCase()))
    .filter(tag => tag.toLowerCase() !== partial.toLowerCase())

  if (matches.length === 0) return null

  // Sort by frequency (implement your existing logic)
  // For now, just return first match
  return matches[0]
}
```

**Add to your editor**:

```typescript
editor = new Editor({
  element: containerRef.current!,
  extensions: [
    StarterKit,
    TagExtension,
    // Add custom plugin for shadow text
    Extension.create({
      name: 'tagShadow',
      addProseMirrorPlugins() {
        return [TagShadowPlugin(props.availableTags || [])]
      }
    })
  ]
})
```

**CSS for shadow text**:

```css
.tag-shadow {
  color: currentColor;
  opacity: 0.4;
  pointer-events: none;
  user-select: none;
}
```

**Key Points**:
- Shadow text appears as you type `#tag`
- Tab accepts the suggestion (just like your current implementation)
- Space or Enter converts to tag pill (via input rule)
- No dropdown - cleaner UX
- Reuses your existing `getTagSuggestion()` logic with frequency sorting

---

#### 2.2 Custom Link Extension

**Implementation Approach**:
- Extend TipTap's built-in `Link` mark
- Add paste handler to detect URLs
- Custom renderer for chip-style display
- Store domain in mark attributes

```typescript
const LinkChipExtension = Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      display: { default: null }, // Domain name
    }
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', {
      class: 'smartlink-chip',
      'data-type': 'link',
      contenteditable: 'false'
    }, [
      'a', {
        ...HTMLAttributes,
        href: HTMLAttributes.href,
        target: '_blank',
        rel: 'noopener noreferrer'
      },
      HTMLAttributes.display || extractDomain(HTMLAttributes.href)
    ]]
  },

  addPasteRules() {
    return [
      // Detect URLs in pasted text
      pasteRegexRule({
        find: /(https?:\/\/[^\s]+)/g,
        handler: ({ match, chain }) => {
          const url = match[0]
          chain()
            .insertContent({
              type: 'text',
              text: ' '
            })
            .setMark('link', {
              href: url,
              display: extractDomain(url)
            })
            .run()
        }
      })
    ]
  }
})
```

---

#### 2.3 User Mention Extension

**Implementation Approach**:
- Use TipTap's `@tiptap/extension-mention`
- Integrate with existing mention palette
- Create custom render component
- Handle `@` trigger with external callback

```typescript
const UserMentionExtension = Mention.configure({
  HTMLAttributes: {
    class: 'mention-person',
  },

  suggestion: {
    char: '@',

    // Custom handler for external palette
    command: ({ editor, range, props }) => {
      // Call external onMention callback
      // Wait for user selection
      // Insert mention via editor commands
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'mention',
          attrs: {
            id: props.userId,
            label: props.display,
            type: 'user'
          }
        })
        .run()
    },

    // Integrate with external MentionPalette
    render: () => {
      let mentionApi

      return {
        onStart: (props) => {
          // Trigger onMention callback with API
          mentionApi = createMentionAPI(props)
          onMentionCallback?.(mentionApi)
        },

        onExit: () => {
          mentionApi?.cancel()
        }
      }
    }
  }
})
```

**Mention Types**:
- Extend to support user, project, and issue mentions
- Use node attributes to distinguish types
- Apply different CSS classes for styling

---

#### 2.4 RichText Data Structure Compatibility

**Challenge**: Maintain `{ text: string, resources: Resource[] }` format for backward compatibility.

**Solution**: Custom serializer/deserializer

```typescript
// TipTap → RichText
function tiptapToRichText(editor: Editor): RichText {
  const resources: Resource[] = []
  let text = ""
  let index = 0

  editor.state.doc.descendants((node) => {
    if (node.type.name === 'tag') {
      resources.push({
        type: 'tag',
        tag: node.attrs.tag
      })
      text += `[[${index}]]`
      index++
    } else if (node.type.name === 'mention') {
      resources.push({
        type: node.attrs.type, // 'user' | 'project' | 'issue'
        [`${node.attrs.type}Id`]: node.attrs.id,
        display: node.attrs.label
      })
      text += `[[${index}]]`
      index++
    } else if (node.marks.find(m => m.type.name === 'link')) {
      const linkMark = node.marks.find(m => m.type.name === 'link')
      resources.push({
        type: 'link',
        url: linkMark.attrs.href,
        display: linkMark.attrs.display
      })
      text += `[[${index}]]`
      index++
    } else if (node.isText) {
      text += node.text
    }
  })

  return { text, resources }
}

// RichText → TipTap
function richTextToTiptap(richText: RichText): JSONContent {
  // Parse text and replace [[0]], [[1]], etc. with nodes
  const content = []
  let currentText = richText.text

  richText.resources.forEach((resource, index) => {
    const placeholder = `[[${index}]]`
    const [before] = currentText.split(placeholder)

    if (before) content.push({ type: 'text', text: before })

    // Convert resource to TipTap node
    if (resource.type === 'tag') {
      content.push({
        type: 'tag',
        attrs: {
          tag: resource.tag,
          color: getTagColor(resource.tag)
        }
      })
    } else if (resource.type === 'link') {
      content.push({
        type: 'text',
        text: resource.display,
        marks: [{
          type: 'link',
          attrs: {
            href: resource.url,
            display: resource.display
          }
        }]
      })
    } else if (['user', 'project', 'issue'].includes(resource.type)) {
      content.push({
        type: 'mention',
        attrs: {
          type: resource.type,
          id: resource[`${resource.type}Id`],
          label: resource.display
        }
      })
    }

    currentText = currentText.split(placeholder)[1]
  })

  if (currentText) content.push({ type: 'text', text: currentText })

  return {
    type: 'doc',
    content: [{
      type: 'paragraph',
      content
    }]
  }
}
```

---

#### 2.5 Imperative API Compatibility

**Goal**: Maintain same `SmartEditorApi` interface.

```typescript
export function TipTapEditor(props: SmartEditorProps) {
  // SETUP SCOPE
  const containerRef = useRef<HTMLDivElement>()
  let editor: Editor | null = null

  const api: SmartEditorApi = {
    clear: () => {
      editor?.commands.clearContent()
    },

    setValue: (value: RichText) => {
      const content = richTextToTiptap(value)
      editor?.commands.setContent(content)
    },

    getValue: () => {
      return tiptapToRichText(editor!)
    },

    cancelMention: () => {
      // Close suggestion plugin
      editor?.commands.closeSuggestion()
    },

    insertMention: (mention: Mention) => {
      editor
        ?.chain()
        .focus()
        .insertContent({
          type: 'mention',
          attrs: {
            type: mention.type,
            id: mention.id,
            label: mention.display
          }
        })
        .run()
    }
  }

  useMountEffect(() => {
    // Initialize TipTap editor - it handles its own DOM manipulation
    editor = new Editor({
      element: containerRef.current!,
      extensions: [
        StarterKit,
        TagExtension,
        LinkChipExtension,
        UserMentionExtension
      ],
      content: props.initialValue ? richTextToTiptap(props.initialValue) : '',
      autofocus: props.focus,

      onUpdate: () => {
        // Optional: trigger re-render if needed
      },

      onBlur: () => {
        props.onBlur?.()
        if (editor) {
          props.onSubmit?.(tiptapToRichText(editor))
        }
      }
    })

    // Expose API via ref
    if (props.apiRef) {
      assignRef(props.apiRef, api)
    }

    // Cleanup on unmount
    return () => {
      editor?.destroy()
      editor = null
    }
  })

  // RENDER SCOPE
  // TipTap mounts itself to containerRef, we just provide the container
  return () => <div ref={containerRef} className="tiptap-editor" />
}
```

---

#### 2.6 Rask UI Integration

**Perfect Fit**: TipTap's vanilla JS core is ideal for Rask since both use direct DOM manipulation.

**Key Insight**: TipTap (via ProseMirror) manages its own DOM tree completely independent of any framework. You simply provide a container element, and TipTap renders into it. This is perfect for Rask's two-scope pattern.

**Solution**:

```typescript
export function TipTapEditor(props: SmartEditorProps) {
  // SETUP SCOPE - runs once
  const containerRef = useRef<HTMLDivElement>()
  let editor: Editor | null = null

  useMountEffect(() => {
    // Initialize TipTap - it will mount to containerRef and handle all DOM updates
    editor = new Editor({
      element: containerRef.current!,
      extensions: [
        StarterKit.configure({
          // Configure which StarterKit extensions you need
          document: true,
          paragraph: true,
          text: true,
          history: true,
          // Disable what you don't need
          bold: false,
          italic: false,
          heading: false,
          blockquote: false,
          codeBlock: false
        }),
        TagExtension,
        LinkChipExtension,
        UserMentionExtension.configure({
          suggestion: {
            // Pass callback to integrate with external mention palette
            onStart: (props) => {
              // Trigger onMention prop
            }
          }
        })
      ],
      content: props.initialValue
        ? richTextToTiptap(props.initialValue)
        : '',
      autofocus: props.focus,

      editorProps: {
        attributes: {
          class: 'tiptap-editor-content',
          placeholder: props.placeholder
        }
      },

      onUpdate: ({ editor }) => {
        // Optional: If you need to sync state to Rask
        // Most of the time you don't need this since TipTap handles its own rendering
      },

      onBlur: () => {
        props.onBlur?.()
        if (editor) {
          props.onSubmit?.(tiptapToRichText(editor))
        }
      },

      onKeyDown: ({ event }) => {
        // Forward keyboard events to parent if needed
        props.onKeyDown?.(event as any)
      }
    })

    // Expose imperative API
    if (props.apiRef) {
      assignRef(props.apiRef, {
        clear: () => editor?.commands.clearContent(),
        setValue: (value) => editor?.commands.setContent(richTextToTiptap(value)),
        getValue: () => tiptapToRichText(editor!),
        cancelMention: () => editor?.commands.closeSuggestion(),
        insertMention: (mention) => {
          editor?.chain().focus().insertContent({
            type: 'mention',
            attrs: {
              type: mention.type,
              id: mention.id,
              label: mention.display
            }
          }).run()
        }
      })
    }

    // Cleanup on unmount
    return () => {
      editor?.destroy()
      editor = null
    }
  })

  // RENDER SCOPE - returns rendering function
  // Just provide the container div, TipTap handles everything else
  return () => <div ref={containerRef} className="tiptap-editor" />
}
```

**Why This Works**:

1. **One-time initialization**: TipTap Editor is created in `useMountEffect()` (setup scope)
2. **Independent rendering**: TipTap manages its own DOM, not controlled by Rask
3. **Container only**: Rask's render function just returns the container `<div>`
4. **No re-renders needed**: TipTap updates its DOM directly, Rask container stays stable
5. **Clean lifecycle**: TipTap destroyed on unmount, no memory leaks

**The Beauty**: Since TipTap doesn't rely on any framework's rendering, it's actually *easier* to integrate with Rask than it would be with React. No virtual DOM conflicts, no reconciliation issues - just pure DOM manipulation from both sides working in harmony.

---

### Phase 3: Testing & Validation

**Goal**: Ensure feature parity and no regressions.

#### Test Cases

1. **Tag System**
   - [ ] Type `#tag ` converts to pill
   - [ ] Tab completion works with available tags
   - [ ] Frequency-based sorting maintained
   - [ ] Same color assignment (hash function)
   - [ ] Backspace deletes entire tag
   - [ ] Tags non-editable

2. **Links**
   - [ ] Paste URL creates chip
   - [ ] Domain extraction correct
   - [ ] Click opens in new tab
   - [ ] Backspace deletes entire link
   - [ ] Links non-editable

3. **Mentions**
   - [ ] `@` triggers mention palette
   - [ ] Insert mention via external callback
   - [ ] Cancel mention with Escape
   - [ ] Blur doesn't submit during mention
   - [ ] User/project/issue types supported
   - [ ] Styling matches (color-coded)

4. **Data Compatibility**
   - [ ] RichText serialization round-trip
   - [ ] Existing saved data loads correctly
   - [ ] New data saves in same format
   - [ ] Display component renders identically

5. **API Compatibility**
   - [ ] `setValue()` works
   - [ ] `getValue()` returns correct RichText
   - [ ] `clear()` empties editor
   - [ ] `insertMention()` inserts at cursor
   - [ ] `cancelMention()` closes palette

6. **Integration**
   - [ ] TodoItem editing works
   - [ ] Calendar new todo works
   - [ ] Conversation messages work
   - [ ] Focus behavior matches
   - [ ] Blur/submit timing matches

---

### Phase 4: Gradual Rollout

**Strategy**: Feature-flagged deployment

1. **Development Testing**
   - Enable TipTap via environment variable
   - Test with development team
   - Gather feedback

2. **Canary Release**
   - Enable for 10% of users
   - Monitor error rates
   - Collect performance metrics

3. **Full Rollout**
   - Enable for all users
   - Remove old SmartEditor code
   - Clean up feature flags

---

## Future Enhancements

### Lists (Post-Migration)

**Implementation**: TipTap has built-in list extensions

```typescript
import { BulletList, OrderedList, ListItem } from '@tiptap/extension-list'

const extensions = [
  BulletList,
  OrderedList,
  ListItem,
  // ... other extensions
]
```

**Features**:
- Bullet lists (`-` or `*`)
- Numbered lists (`1.`)
- Nested lists
- Task lists with checkboxes

**UI**:
- Toolbar buttons for list types
- Keyboard shortcuts (Cmd+Shift+8 for bullets)
- Tab/Shift+Tab for indentation

---

### Images (Post-Migration)

**Implementation**: TipTap Image extension with upload handling

```typescript
import { Image } from '@tiptap/extension-image'

const ImageExtension = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null },
      height: { default: null },
      alt: { default: null }
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleDrop(view, event) {
            // Handle image drop
            const files = event.dataTransfer?.files
            if (files?.[0]?.type.startsWith('image/')) {
              // Upload to storage
              // Insert image node
            }
          },

          handlePaste(view, event) {
            // Handle image paste
          }
        }
      })
    ]
  }
})
```

**Features**:
- Drag & drop upload
- Paste from clipboard
- Resize handles
- Alt text support
- Image optimization
- Cloud storage integration

---

### Syntax Highlighting (High Priority)

**Implementation**: TipTap CodeBlockLowlight extension with Lowlight/Highlight.js

```typescript
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { lowlight } from 'lowlight'

// Register languages
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import python from 'highlight.js/lib/languages/python'
import css from 'highlight.js/lib/languages/css'
import html from 'highlight.js/lib/languages/xml'
import json from 'highlight.js/lib/languages/json'

lowlight.registerLanguage('javascript', javascript)
lowlight.registerLanguage('typescript', typescript)
lowlight.registerLanguage('python', python)
lowlight.registerLanguage('css', css)
lowlight.registerLanguage('html', html)
lowlight.registerLanguage('json', json)

const extensions = [
  CodeBlockLowlight.configure({
    lowlight,
    defaultLanguage: 'javascript'
  })
]
```

**Features**:
- Language selection dropdown
- Auto-detection from paste
- Line numbers
- Copy button
- Theme support (light/dark)
- Common languages (JS, TS, Python, CSS, HTML, JSON, etc.)

**UI Enhancements**:
- Language badge in corner
- Syntax theme matching app theme
- Code block toolbar
- Keyboard shortcut (Cmd+Alt+C)

**Styling**:
```css
/* Use Highlight.js theme or custom */
@import 'highlight.js/styles/github-dark.css';

.hljs {
  padding: 1rem;
  border-radius: 0.5rem;
  background: var(--code-bg);
}
```

---

### Additional Future Features

1. **Tables**
   - `@tiptap/extension-table`
   - Resizable columns
   - Row/column operations

2. **Markdown Support**
   - `@tiptap/extension-markdown`
   - Parse markdown input
   - Export to markdown

3. **Collaborative Editing**
   - `@tiptap/extension-collaboration`
   - Real-time editing with Y.js
   - Cursor presence

4. **Text Formatting**
   - Bold, Italic, Underline
   - Text color, highlight
   - Font size

5. **Slash Commands**
   - `/` trigger for command palette
   - Quick insertion of blocks
   - Custom commands for tags/mentions

---

## Risk Assessment

### High Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Data Migration Issues** | Existing RichText data doesn't load | Comprehensive serializer tests, backward compatibility layer |
| **API Breaking Changes** | Components using SmartEditorApi break | Maintain identical API surface, integration tests |
| **Performance Regression** | TipTap slower than custom implementation | Benchmark before/after, optimize extensions, lazy load |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Bundle Size Increase** | Larger JavaScript payload | Tree-shake unused extensions, code split TipTap, use core only |
| **Styling Conflicts** | TipTap CSS conflicts with existing styles | Scope TipTap styles, use CSS modules |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Learning Curve** | Team needs to learn ProseMirror concepts | Documentation, examples, gradual rollout |
| **Extension Bugs** | Third-party extensions have issues | Audit extensions, contribute fixes, fork if needed |

---

## Success Criteria

### Must Have (Phase 2)

- [ ] All current features work identically
- [ ] RichText format unchanged (backward compatible)
- [ ] SmartEditorApi interface preserved
- [ ] Visual appearance matches exactly
- [ ] Performance equal or better
- [ ] Zero regressions in existing usage

### Should Have (Phase 4)

- [ ] Bundle size < 50KB increase
- [ ] Test coverage > 90%
- [ ] Documentation complete
- [ ] Migration guide for future extensions

### Nice to Have (Future)

- [ ] Lists implemented
- [ ] Images implemented
- [ ] Syntax highlighting implemented
- [ ] Slash commands implemented

---

## Timeline Estimate

**Note**: Focus on implementation steps, not time estimates. Prioritize based on risk and dependencies.

### Phase 1: Foundation
- Dependencies installed
- Basic TipTap wrapper created
- Development toggle working

### Phase 2: Feature Parity
- Tag extension complete
- Link extension complete
- Mention extension complete
- Serialization working
- API compatibility confirmed
- All tests passing

### Phase 3: Validation
- Integration testing complete
- Performance benchmarked
- User acceptance testing

### Phase 4: Rollout
- Canary deployment
- Full rollout
- Old code removed

### Phase 5: Future Features
- Lists (when needed)
- Images (when needed)
- Syntax highlighting (high priority after rollout)

---

## Recommended Approach

### Start Small

1. Create TipTap wrapper with basic text editing
2. Add ONE feature at a time (tags → links → mentions)
3. Test thoroughly after each addition
4. Keep old SmartEditor until 100% parity achieved

### Leverage TipTap Ecosystem

1. Use built-in extensions where possible
2. Only create custom extensions for unique features (tags, resource system)
3. Follow TipTap patterns for consistency
4. Contribute improvements back to ecosystem

### Maintain Backward Compatibility

1. Keep RichText format unchanged
2. Preserve SmartEditorApi exactly
3. Test with real production data
4. Have rollback plan ready

---

## Conclusion

Migrating to TipTap provides:

**Immediate Benefits**:
- Reduced maintenance burden (766 lines → extensions)
- Battle-tested ProseMirror foundation
- Better accessibility out of the box
- Professional-grade editing experience
- **Perfect fit with Rask**: Both use direct DOM manipulation, no framework conflicts

**Long-term Benefits**:
- Easy addition of lists, images, syntax highlighting
- Potential for collaboration features (Y.js integration)
- Markdown export/import capabilities
- Rich extension ecosystem
- Active community and support

**Rask-Specific Advantages**:
- Uses `@tiptap/core` (vanilla JS) - no React dependency
- TipTap's DOM manipulation is completely independent
- Integrates cleanly with Rask's two-scope pattern
- One-time initialization in setup scope
- TipTap handles all updates internally
- No virtual DOM conflicts or reconciliation issues

**Key Success Factors**:
1. Maintain complete feature parity before rollout
2. Preserve RichText data format for backward compatibility
3. Thorough testing at each phase
4. Gradual rollout with feature flags
5. Clear rollback strategy

The migration is **highly recommended** and **feasible** with careful execution of this plan. TipTap's vanilla JavaScript core makes it an excellent match for Rask, avoiding the complexity of framework wrappers. The investment will pay dividends in maintainability and future extensibility, especially for syntax highlighting which is a high-priority enhancement.
