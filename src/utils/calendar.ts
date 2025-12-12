export function getWeekdaysForThreeWeeks() {
  const today = new Date();
  const currentDay = today.getDay();
  const isWeekend = currentDay === 0 || currentDay === 6;

  // Calculate days offset to get to Monday
  // If it's weekend, start from next Monday instead of current Monday
  let daysToMonday: number;
  if (isWeekend) {
    // Saturday (6) -> +2 days, Sunday (0) -> +1 day
    daysToMonday = currentDay === 0 ? 1 : 2;
  } else {
    // Weekday -> go back to Monday of current week
    daysToMonday = -(currentDay - 1);
  }

  const weekdays: Date[] = [];

  // Start from Monday (current week Monday on weekdays, next week Monday on weekends)
  const startDate = new Date(today);
  startDate.setDate(today.getDate() + daysToMonday);

  // Add 10 weekdays (Monday-Friday for 2 weeks)
  let addedDays = 0;
  let currentDate = new Date(startDate);

  while (addedDays < 10) {
    const dayOfWeek = currentDate.getDay();
    // Only add Monday (1) through Friday (5)
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      weekdays.push(new Date(currentDate));
      addedDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return weekdays;
}

export function formatDayName(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "long" });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatHeader(date: Date): string {
  return `${formatDayName(date)} - ${formatDate(date)}`;
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function getDateId(date: Date): string {
  return date.toISOString().split("T")[0];
}
