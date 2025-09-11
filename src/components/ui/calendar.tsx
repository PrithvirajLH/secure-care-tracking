
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  showOutsideDays?: boolean;
  className?: string;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function Calendar({ selected, onSelect, showOutsideDays = false, className }: CalendarProps) {
  const initialMonth = selected ? startOfMonth(selected) : startOfMonth(new Date());
  const [currentMonth, setCurrentMonth] = React.useState<Date>(initialMonth);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startWeekday = monthStart.getDay(); // 0=Sun
  const daysInMonth = monthEnd.getDate();

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const weeks: Array<Array<{ date: Date; inCurrentMonth: boolean }>> = [];
  let currentDayIndex = 0;
  let week: Array<{ date: Date; inCurrentMonth: boolean }> = [];

  // Leading outside days
  if (startWeekday > 0) {
    const lastMonthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 0);
    const lastMonthDays = lastMonthEnd.getDate();
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, lastMonthDays - i);
      week.push({ date: d, inCurrentMonth: false });
      currentDayIndex++;
    }
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    week.push({ date: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day), inCurrentMonth: true });
    currentDayIndex++;
    if (currentDayIndex === 7) {
      weeks.push(week);
      week = [];
      currentDayIndex = 0;
    }
  }

  // Trailing outside days
  if (currentDayIndex > 0) {
    const needed = 7 - currentDayIndex;
    for (let i = 1; i <= needed; i++) {
      week.push({ date: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, i), inCurrentMonth: false });
    }
    weeks.push(week);
  }

  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div className={cn("p-3 w-[300px]", className)}>
      <div className="relative flex items-center justify-center pb-2">
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 absolute left-1")}
          onClick={prevMonth}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-medium">
          {currentMonth.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </div>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100 absolute right-1")}
          onClick={nextMonth}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekdays.map((wd) => (
          <div key={wd} className="text-muted-foreground rounded-md text-center font-normal text-[0.8rem]">
            {wd}
          </div>
        ))}
      </div>

      <div className="mt-1 space-y-1">
        {weeks.map((w, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {w.map(({ date, inCurrentMonth }) => {
              const isSelected = selected ? isSameDay(date, selected) : false;
              const isToday = isSameDay(date, new Date());
              const isOutside = !inCurrentMonth;
              if (isOutside && !showOutsideDays) {
                return <div key={date.toISOString()} className="h-9" />;
              }
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => onSelect?.(date)}
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-9 w-full p-0 font-normal relative",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    isToday && !isSelected && "ring-2 ring-indigo-500 ring-offset-1",
                    isOutside && "text-muted-foreground opacity-50",
                  )}
                  aria-pressed={isSelected}
                  aria-current={isToday ? 'date' : undefined}
                >
                  {date.getDate()}
                  {isToday && !isSelected && (
                    <span className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

Calendar.displayName = "Calendar";
export { Calendar };
