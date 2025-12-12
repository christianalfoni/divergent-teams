import SmartEditor from './SmartEditor';

export default function TodoItem({ todo, onClick, isActive }) {
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(todo);
      }}
      className={`group/todo relative flex gap-3 text-xs/5 py-1 px-3 select-none cursor-pointer ${
        isActive ? 'bg-gray-100' : 'hover:bg-gray-100'
      }`}
    >
      <div className="flex h-5 shrink-0 items-center">
        <div className="group/checkbox relative grid size-4 grid-cols-1">
          <input
            type="checkbox"
            checked={todo.completed}
            readOnly
            className="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-indigo-600 checked:bg-indigo-600"
          />
          <svg
            fill="none"
            viewBox="0 0 14 14"
            className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white"
          >
            <path
              d="M3 8L6 11L11 3.5"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`${todo.completed ? 'opacity-100' : 'opacity-0'}`}
            />
          </svg>
        </div>
      </div>
      <div
        className={`flex-1 min-w-0 text-xs/5 select-none ${
          todo.completed ? "line-through text-gray-500" : "text-gray-900"
        }`}
      >
        <SmartEditor
          html={todo.text}
          editing={false}
        />
      </div>
    </div>
  );
}
