import { useEffect, useMountEffect, useRef, useState } from "rask-ui";
import TodoItem from "./TodoItem";

// Mock todo data with tags, URLs, and mentions
const mockTodos = {
  0: [
    // Monday
    {
      id: "1",
      text: 'Report back to <span data-mention="person" data-name="john" class="tag-pill mention-person" contenteditable="false">john</span> on backend tier issues <span data-tag="urgent" class="tag-pill tag-pill-red" contenteditable="false">urgent</span> <span data-tag="backend" class="tag-pill tag-pill-blue" contenteditable="false">backend</span>',
      completed: false,
    },
    {
      id: "2",
      text: 'Follow-up on <span data-mention="issue" data-issue="42" class="tag-pill mention-issue" contenteditable="false">42</span> with sdk book session <span data-url="https://docs.example.com/sdk" class="smartlink-chip" contenteditable="false">docs.example.com</span> <span data-tag="followup" class="tag-pill tag-pill-yellow" contenteditable="false">followup</span>',
      completed: true,
    },
    {
      id: "3",
      text: 'Fix pension amount in <span data-mention="project" data-name="payroll-system" class="tag-pill mention-project" contenteditable="false">payroll-system</span>, now it is 7000, should be 9000 <span data-tag="finance" class="tag-pill tag-pill-green" contenteditable="false">finance</span>',
      completed: true,
    },
  ],
  1: [
    // Tuesday
    {
      id: "4",
      text: 'Ask <span data-mention="person" data-name="kirsh" class="tag-pill mention-person" contenteditable="false">kirsh</span> about file write error in <span data-mention="project" data-name="uncommon-api" class="tag-pill mention-project" contenteditable="false">uncommon-api</span> <span data-url="https://github.com/project/issues/42" class="smartlink-chip" contenteditable="false">github.com</span> <span data-tag="bug" class="tag-pill tag-pill-red" contenteditable="false">bug</span>',
      completed: false,
    },
    {
      id: "5",
      text: 'Review team progress on Q4 goals with <span data-mention="person" data-name="sarah" class="tag-pill mention-person" contenteditable="false">sarah</span> <span data-tag="planning" class="tag-pill tag-pill-purple" contenteditable="false">planning</span> <span data-tag="review" class="tag-pill tag-pill-blue" contenteditable="false">review</span>',
      completed: false,
    },
  ],
  2: [
    // Wednesday
    {
      id: "6",
      text: 'Team standup at 10am <span data-tag="meeting" class="tag-pill tag-pill-indigo" contenteditable="false">meeting</span>',
      completed: true,
    },
    {
      id: "7",
      text: 'Update documentation for <span data-mention="project" data-name="new-api" class="tag-pill mention-project" contenteditable="false">new-api</span> <span data-url="https://api-docs.company.com" class="smartlink-chip" contenteditable="false">api-docs.company.com</span> <span data-tag="docs" class="tag-pill tag-pill-green" contenteditable="false">docs</span>',
      completed: false,
    },
  ],
  3: [
    // Thursday
    {
      id: "8",
      text: 'Client meeting at 2pm with <span data-mention="person" data-name="mike" class="tag-pill mention-person" contenteditable="false">mike</span> <span data-url="https://zoom.us/j/123456789" class="smartlink-chip" contenteditable="false">zoom.us</span> <span data-tag="meeting" class="tag-pill tag-pill-indigo" contenteditable="false">meeting</span> <span data-tag="client" class="tag-pill tag-pill-pink" contenteditable="false">client</span>',
      completed: false,
    },
  ],
  4: [
    // Friday
    {
      id: "9",
      text: 'Code review session for <span data-mention="project" data-name="mobile-app" class="tag-pill mention-project" contenteditable="false">mobile-app</span> <span data-tag="review" class="tag-pill tag-pill-blue" contenteditable="false">review</span>',
      completed: false,
    },
    {
      id: "10",
      text: 'Deploy <span data-mention="project" data-name="staging-env" class="tag-pill mention-project" contenteditable="false">staging-env</span> environment <span data-url="https://staging.example.com" class="smartlink-chip" contenteditable="false">staging.example.com</span> <span data-tag="deployment" class="tag-pill tag-pill-yellow" contenteditable="false">deployment</span>',
      completed: false,
    },
  ],
};

export function Calendar() {
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
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const columnRefs = [] as any[];

  // Collapsed column width
  const COLLAPSED_WIDTH = 100;

  // Calculate widths based on window size
  const calculateWidths = () => {
    const containerWidth = window.innerWidth;
    const width = containerWidth / 5;
    // Chat width = remaining space after one column and 4 collapsed columns
    const chat = containerWidth - width - 4 * COLLAPSED_WIDTH;
    return { columnWidth: width, chatWidth: chat };
  };

  const state = useState({
    ...calculateWidths(),
    isTransitioning: false,
    expandedTodo: null as any,
  });

  // Find current day index
  const currentDayIndex = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return weekdays.findIndex((date) => {
      const compareDate = new Date(date);
      compareDate.setHours(0, 0, 0, 0);
      return compareDate.getTime() === today.getTime();
    });
  })();

  // Update widths on window resize
  useEffect(() => {
    const handleResize = () => {
      const { columnWidth, chatWidth } = calculateWidths();
      state.columnWidth = columnWidth;
      state.chatWidth = chatWidth;
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  });

  // Helper to check if a day is expanded
  const isExpanded = (index: number) => state.expandedTodo?.dayIndex === index;

  // Helper to get column style
  const getColumnStyle = (index: number) => {
    const baseStyle = {
      "flex-grow": 0,
      "flex-shrink": 0,
      transition: "flex-basis 350ms cubic-bezier(0.4, 0.0, 0.2, 1)",
    };

    if (!state.expandedTodo) {
      // When nothing is expanded, use explicit equal width
      return {
        ...baseStyle,
        "flex-basis": `${state.columnWidth}px`,
      };
    }

    if (isExpanded(index)) {
      // Expanded column gets todo width + chat width
      return {
        ...baseStyle,
        "flex-basis": `${state.columnWidth + state.chatWidth}px`,
      };
    }

    // Collapsed columns get fixed 100px
    return {
      ...baseStyle,
      "flex-basis": `${COLLAPSED_WIDTH}px`,
    };
  };

  // Handle todo click
  const handleTodoClick = (dayIndex: number, todo: any) => {
    // If clicking the same todo, collapse it but keep chat state
    if (state.expandedTodo?.todoId === todo.id) {
      state.isTransitioning = true;
      state.expandedTodo = null;

      setTimeout(() => {
        state.isTransitioning = false;
      }, 350);
      return;
    }

    // Expand the clicked todo and set up chat state
    state.isTransitioning = true;
    state.expandedTodo = { dayIndex, todoId: todo.id, todo };

    setTimeout(() => {
      state.isTransitioning = false;
    }, 350);
  };

  // Handle day click (only when not in expanded mode)
  const handleDayClick = () => {
    if (!state.expandedTodo) {
      // Normal day expansion behavior could go here if needed
    }
  };

  return () => (
    <div className="flex-1 w-full flex flex-col overflow-hidden">
      <div className="flex flex-1 min-h-0">
        {weekdays.map((date, index) => (
          <div
            key={index}
            ref={(el) => {
              columnRefs[index] = el;
            }}
            className="flex flex-col bg-[var(--color-bg-secondary)] border-r border-[var(--color-border-primary)] last:border-r-0 overflow-hidden transition-all"
            style={getColumnStyle(index)}
            onClick={() => handleDayClick()}
          >
            {/* Day content area - always contains both todos and chat */}
            <div className="flex h-full">
              {/* Todo list with header - fixed initial column width */}
              <div
                className="flex-shrink-0 flex flex-col overflow-hidden"
                style={{
                  width: state.columnWidth ? `${state.columnWidth}px` : "auto",
                }}
              >
                {/* Day header */}
                <div className="p-4 flex-shrink-0">
                  <div
                    className={`flex items-center gap-2 text-sm font-medium ${
                      index === currentDayIndex
                        ? "text-[var(--color-accent-primary)]"
                        : "text-[var(--color-text-secondary)]"
                    }`}
                  >
                    <span>{dayNames[index]}</span>
                    <span>{date.getDate()}</span>
                  </div>
                </div>

                {/* Todos list */}
                <div className="flex-1 overflow-y-auto">
                  <div
                    className={
                      state.expandedTodo && !isExpanded(index)
                        ? "opacity-0"
                        : "opacity-100"
                    }
                    style={{
                      transition: "opacity 350ms cubic-bezier(0.4, 0.0, 0.2, 1)",
                    }}
                  >
                    {mockTodos[index]?.map((todo) => (
                      <TodoItem
                        key={todo.id}
                        todo={todo}
                        onToggleTodoComplete={() => {}}
                        onClick={() => handleTodoClick(index, todo)}
                        isActive={state.expandedTodo?.todoId === todo.id}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Chat interface - shows when chat state exists */}
              {state.expandedTodo && (
                <div
                  className="flex-shrink-0 flex flex-col bg-[var(--color-bg-hover)] h-full"
                  style={{
                    width: state.chatWidth ? `${state.chatWidth}px` : "400px",
                  }}
                >
                  {/* Messages container */}
                  <div className="flex-1 overflow-y-auto p-3">
                    {/* Messages will go here */}
                  </div>

                  {/* Message input - at bottom */}
                  <div className="p-3 pt-0">
                    <input
                      type="text"
                      placeholder={`Message...`}
                      className="w-full px-3 py-2 text-xs border border-[var(--color-border-secondary)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)] placeholder:text-[var(--color-text-secondary)]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
