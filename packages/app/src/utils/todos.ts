import type { Todo } from "@divergent-teams/shared";
import { getNextWorkday } from "./calendar";

export function getOldUncompletedTodos(todos: Todo[]): Todo[] {
  const targetDate = getNextWorkday();
  const targetDateString = targetDate.toISOString().split("T")[0];

  return todos.filter((todo) => {
    if (todo.completed) return false;
    const todoDateString = todo.date.toDate().toISOString().split("T")[0];
    return todoDateString < targetDateString;
  });
}

export function getGeneratedTodos(todos: Todo[]): Todo[] {
  return todos.filter((todo) => todo.isGenerated);
}

export function filterOutGeneratedTodos(todos: Todo[]): Todo[] {
  return todos.filter((todo) => !todo.isGenerated);
}
