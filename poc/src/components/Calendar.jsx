import { useState, useMemo, useRef, useEffect } from 'react';
import TodoItem from './TodoItem';

export default function Calendar() {
  // Generate the current week's weekdays (Monday - Friday)
  const getWeekdays = () => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const monday = new Date(today);

    // Calculate days to subtract to get to Monday
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;
    monday.setDate(today.getDate() - daysFromMonday);

    const weekdays = [];
    for (let i = 0; i < 5; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      weekdays.push(date);
    }

    return weekdays;
  };

  const weekdays = getWeekdays();
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const columnRefs = useRef([]);
  const containerRef = useRef(null);
  const [columnWidth, setColumnWidth] = useState(null);
  const [chatWidth, setChatWidth] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const hasInitialized = useRef(false);

  // Collapsed column width
  const COLLAPSED_WIDTH = 100;

  // Mock todo data with tags, URLs, and mentions
  const mockTodos = {
    0: [ // Monday
      { id: '1', text: 'Report back to <span data-mention="person" data-name="john" class="mention-pill mention-person" contenteditable="false"><svg class="mention-icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>john</span> on backend tier issues <span data-tag="urgent" class="tag-pill tag-pill-red" contenteditable="false">urgent</span> <span data-tag="backend" class="tag-pill tag-pill-blue" contenteditable="false">backend</span>', completed: false },
      { id: '2', text: 'Follow-up on <span data-mention="issue" data-issue="42" class="mention-pill mention-issue" contenteditable="false"><svg class="mention-icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0 1 12 12.75Zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 0 1-1.152 6.06M12 12.75c-2.883 0-5.647.508-8.208 1.44.125 2.104.52 4.136 1.153 6.06M12 12.75a2.25 2.25 0 0 0 2.248-2.354M12 12.75a2.25 2.25 0 0 1-2.248-2.354M12 8.25c.995 0 1.971-.08 2.922-.236.403-.066.74-.358.795-.762a3.778 3.778 0 0 0-.399-2.25M12 8.25c-.995 0-1.97-.08-2.922-.236-.402-.066-.74-.358-.795-.762a3.734 3.734 0 0 1 .4-2.253M12 8.25a2.25 2.25 0 0 0-2.248 2.146M12 8.25a2.25 2.25 0 0 1 2.248 2.146M8.683 5a6.032 6.032 0 0 1-1.155-1.002c.07-.63.27-1.222.574-1.747m.581 2.749A3.75 3.75 0 0 1 15.318 5m0 0c.427-.283.815-.62 1.155-.999a4.471 4.471 0 0 0-.575-1.752M4.921 6a24.048 24.048 0 0 0-.392 3.314c1.668.546 3.416.914 5.223 1.082M19.08 6c.205 1.08.337 2.187.392 3.314a23.882 23.882 0 0 1-5.223 1.082" /></svg>#42</span> with sdk book session <span data-url="https://docs.example.com/sdk" class="smartlink-chip" contenteditable="false">docs.example.com</span> <span data-tag="followup" class="tag-pill tag-pill-yellow" contenteditable="false">followup</span>', completed: true },
      { id: '3', text: 'Fix pension amount in <span data-mention="project" data-name="payroll-system" class="mention-pill mention-project" contenteditable="false"><svg class="mention-icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>payroll-system</span>, now it is 7000, should be 9000 <span data-tag="finance" class="tag-pill tag-pill-green" contenteditable="false">finance</span>', completed: true },
    ],
    1: [ // Tuesday
      { id: '4', text: 'Ask <span data-mention="person" data-name="kirsh" class="mention-pill mention-person" contenteditable="false"><svg class="mention-icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>kirsh</span> about file write error in <span data-mention="project" data-name="uncommon-api" class="mention-pill mention-project" contenteditable="false"><svg class="mention-icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>uncommon-api</span> <span data-url="https://github.com/project/issues/42" class="smartlink-chip" contenteditable="false">github.com</span> <span data-tag="bug" class="tag-pill tag-pill-red" contenteditable="false">bug</span>', completed: false },
      { id: '5', text: 'Review team progress on Q4 goals with <span data-mention="person" data-name="sarah" class="mention-pill mention-person" contenteditable="false"><svg class="mention-icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>sarah</span> <span data-tag="planning" class="tag-pill tag-pill-purple" contenteditable="false">planning</span> <span data-tag="review" class="tag-pill tag-pill-blue" contenteditable="false">review</span>', completed: false },
    ],
    2: [ // Wednesday
      { id: '6', text: 'Team standup at 10am <span data-tag="meeting" class="tag-pill tag-pill-indigo" contenteditable="false">meeting</span>', completed: true },
      { id: '7', text: 'Update documentation for <span data-mention="project" data-name="new-api" class="mention-pill mention-project" contenteditable="false"><svg class="mention-icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>new-api</span> <span data-url="https://api-docs.company.com" class="smartlink-chip" contenteditable="false">api-docs.company.com</span> <span data-tag="docs" class="tag-pill tag-pill-green" contenteditable="false">docs</span>', completed: false },
    ],
    3: [ // Thursday
      { id: '8', text: 'Client meeting at 2pm with <span data-mention="person" data-name="mike" class="mention-pill mention-person" contenteditable="false"><svg class="mention-icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>mike</span> <span data-url="https://zoom.us/j/123456789" class="smartlink-chip" contenteditable="false">zoom.us</span> <span data-tag="meeting" class="tag-pill tag-pill-indigo" contenteditable="false">meeting</span> <span data-tag="client" class="tag-pill tag-pill-pink" contenteditable="false">client</span>', completed: false },
    ],
    4: [ // Friday
      { id: '9', text: 'Code review session for <span data-mention="project" data-name="mobile-app" class="mention-pill mention-project" contenteditable="false"><svg class="mention-icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>mobile-app</span> <span data-tag="review" class="tag-pill tag-pill-blue" contenteditable="false">review</span>', completed: false },
      { id: '10', text: 'Deploy <span data-mention="project" data-name="staging-env" class="mention-pill mention-project" contenteditable="false"><svg class="mention-icon" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" /></svg>staging-env</span> environment <span data-url="https://staging.example.com" class="smartlink-chip" contenteditable="false">staging.example.com</span> <span data-tag="deployment" class="tag-pill tag-pill-yellow" contenteditable="false">deployment</span>', completed: false },
    ],
  };

  // Find current day index
  const currentDayIndex = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return weekdays.findIndex(date => {
      const compareDate = new Date(date);
      compareDate.setHours(0, 0, 0, 0);
      return compareDate.getTime() === today.getTime();
    });
  }, [weekdays]);

  // Track which todo is expanded (stores { dayIndex, todoId })
  const [expandedTodo, setExpandedTodo] = useState(null);

  // Track the chat state separately so it persists when todo collapses
  const [chatState, setChatState] = useState(null); // { todo, dayIndex, todoId, mentions, activeTab }

  // Track active chat tab (mention)
  const [activeChatTab, setActiveChatTab] = useState(null);

  // Extract mentions from todo HTML
  const extractMentions = (todoHtml) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(todoHtml, 'text/html');
    const mentionSpans = doc.querySelectorAll('[data-mention]');

    return Array.from(mentionSpans).map(span => {
      const type = span.getAttribute('data-mention');
      const name = span.getAttribute('data-name') || span.getAttribute('data-issue');
      // Get the icon HTML
      const iconElement = span.querySelector('.mention-icon');
      const iconHtml = iconElement ? iconElement.outerHTML : '';
      // Get just the text (not including the icon)
      const textNode = Array.from(span.childNodes).find(node => node.nodeType === Node.TEXT_NODE);
      const text = textNode ? textNode.textContent.trim() : name;

      return {
        type,
        name,
        text,
        iconHtml,
      };
    });
  };

  // Get mentions from chat state (persists even when todo collapses)
  const currentMentions = chatState?.mentions || [];

  // Set active chat tab when chat state is first created
  useEffect(() => {
    if (chatState && currentMentions.length > 0 && !activeChatTab) {
      setActiveChatTab(currentMentions[0]);
    }
  }, [chatState, currentMentions.length, activeChatTab]);

  // Measure column width when not expanded
  useEffect(() => {
    if (!expandedTodo && !isTransitioning && containerRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const width = containerWidth / 5;
      // Chat width = remaining space after one column and 4 collapsed columns
      const chat = containerWidth - width - (4 * COLLAPSED_WIDTH);
      setColumnWidth(width);
      setChatWidth(chat);

      // Mark as initialized after first measurement
      if (!hasInitialized.current) {
        hasInitialized.current = true;
      }
    }
  }, [expandedTodo, isTransitioning]);

  // Helper to check if a day is current
  const isCurrentDay = (index) => index === currentDayIndex;

  // Helper to check if a day is expanded
  const isExpanded = (index) => expandedTodo?.dayIndex === index;

  // Helper to get column style
  const getColumnStyle = (index) => {
    // Before measurement, use relative flex without transitions
    if (!columnWidth || !chatWidth) {
      return {
        flex: '1 1 0'
      };
    }

    const baseStyle = {
      flexGrow: 0,
      flexShrink: 0,
      // Add transition when expanding or collapsing (but not on initial load)
      ...(hasInitialized.current && (expandedTodo || isTransitioning) ? {
        transition: 'flex-basis 350ms cubic-bezier(0.4, 0.0, 0.2, 1)'
      } : {})
    };

    if (!expandedTodo) {
      // When nothing is expanded, use explicit equal width
      return {
        ...baseStyle,
        flexBasis: `${columnWidth}px`
      };
    }

    if (isExpanded(index)) {
      // Expanded column gets todo width + chat width
      return {
        ...baseStyle,
        flexBasis: `${columnWidth + chatWidth}px`
      };
    }

    // Collapsed columns get fixed 100px
    return {
      ...baseStyle,
      flexBasis: `${COLLAPSED_WIDTH}px`
    };
  };

  // Handle todo click
  const handleTodoClick = (dayIndex, todo) => {
    // If clicking the same todo, collapse it but keep chat state
    if (expandedTodo?.todoId === todo.id) {
      setIsTransitioning(true);
      setExpandedTodo(null);
      setTimeout(() => setIsTransitioning(false), 350);
      return;
    }

    // Expand the clicked todo and set up chat state
    setIsTransitioning(true);
    setExpandedTodo({ dayIndex, todoId: todo.id, todo });

    // Initialize or update chat state with mentions
    const mentions = extractMentions(todo.text);
    setChatState({
      todo,
      dayIndex,
      todoId: todo.id,
      mentions,
    });

    setTimeout(() => setIsTransitioning(false), 350);
  };

  // Handle day click (only when not in expanded mode)
  const handleDayClick = (index) => {
    if (!expandedTodo) {
      // Normal day expansion behavior could go here if needed
    }
  };

  return (
    <div className="flex-1 w-full flex flex-col overflow-hidden">
      <div
        ref={containerRef}
        className="flex flex-1 min-h-0"
      >
        {weekdays.map((date, index) => (
          <div
            key={index}
            ref={(el) => {
              columnRefs.current[index] = el;
            }}
            className="flex flex-col bg-white border-r border-gray-200 last:border-r-0 overflow-hidden"
            style={getColumnStyle(index)}
            onClick={() => handleDayClick(index)}
          >
            {/* Day header */}
            <div className="p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                <span>{dayNames[index]}</span>
                <span>{date.getDate()}</span>
              </div>
            </div>

            {/* Day content area - always contains both todos and chat */}
            <div className="flex h-full">
              {/* Todo list - fixed initial column width */}
              <div
                className="flex-shrink-0 overflow-y-auto"
                style={{ width: columnWidth ? `${columnWidth}px` : 'auto' }}
              >
                <div
                  className={expandedTodo && !isExpanded(index) ? 'opacity-0' : 'opacity-100'}
                  style={{ transition: 'opacity 350ms cubic-bezier(0.4, 0.0, 0.2, 1)' }}
                >
                  {mockTodos[index]?.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      onClick={() => handleTodoClick(index, todo)}
                      isActive={expandedTodo?.todoId === todo.id && isExpanded(index)}
                    />
                  ))}
                </div>
              </div>

              {/* Chat interface - shows when chat state exists */}
              {chatState && (
                <div
                  className="flex-shrink-0 flex flex-col bg-gray-50"
                  style={{ width: chatWidth ? `${chatWidth}px` : '400px' }}
                >
                  {/* Mention tabs */}
                  {currentMentions.length > 0 && (
                  <div className="flex gap-1 px-4 py-3 bg-gray-800">
                    {currentMentions.map((mention, idx) => {
                      const isActive = activeChatTab?.name === mention.name && activeChatTab?.type === mention.type;
                      return (
                        <button
                          key={`${mention.type}-${mention.name}`}
                          onClick={() => setActiveChatTab(mention)}
                          className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                            isActive
                              ? 'bg-gray-900 text-white'
                              : 'text-gray-300 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <span dangerouslySetInnerHTML={{ __html: mention.iconHtml }} />
                          <span>{mention.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                  {/* Chat messages area */}
                  <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden">
                    {activeChatTab ? (
                      <div className="text-xs text-gray-500">
                        Chat with <span className="font-medium">{activeChatTab.text}</span> about this todo
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">
                        {currentMentions.length === 0 && 'No mentions in this todo'}
                      </div>
                    )}
                  </div>

                  {/* Message input */}
                  {activeChatTab && (
                    <div className="p-3 bg-white border-t border-gray-200">
                      <input
                        type="text"
                        placeholder={`Message ${activeChatTab.text}...`}
                        className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
