import { DayCell } from "./DayCell";
import { getWeekdaysForThreeWeeks, isToday } from "../utils/calendar";

export function Calendar() {
  const allWeekdays = getWeekdaysForThreeWeeks();
  // Show first 5 days (one week)
  const weekdays = (() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    if (isWeekend) {
      // Show next week (first 5 days)
      return allWeekdays.slice(0, 5);
    }

    // Show current week (first 5 days)
    return allWeekdays.slice(0, 5);
  })();

  return () => (
    <div class="flex-1 w-full flex flex-col overflow-hidden">
      <div class="grid grid-cols-5 grid-rows-1 flex-1 divide-x divide-y divide-(--color-border-primary) min-h-0">
        {weekdays.map((date, index) => {
          return <DayCell key={index} date={date} isToday={isToday(date)} />;
        })}
      </div>
    </div>
  );
}
