
import React from 'react';

interface CalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  tasks: { date: string }[];
}

export const Calendar: React.FC<CalendarProps> = ({ selectedDate, onDateSelect, tasks }) => {
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };

  const isSelected = (day: number) => {
    return selectedDate.getDate() === day && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
  };

  const hasTasks = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.some(t => t.date === dateStr);
  };

  const prevMonth = () => onDateSelect(new Date(year, month - 1, 1));
  const nextMonth = () => onDateSelect(new Date(year, month + 1, 1));

  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 text-sm">
          {year}年 {month + 1}月
        </h3>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={nextMonth} className="p-1 hover:bg-slate-50 rounded-lg text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(d => (
          <div key={d} className="text-[10px] font-bold text-slate-300 text-center py-1 uppercase">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {blanks.map(i => <div key={`blank-${i}`} />)}
        {days.map(day => (
          <button
            key={day}
            onClick={() => onDateSelect(new Date(year, month, day))}
            className={`
              relative h-8 w-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-all
              ${isSelected(day) ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}
              ${isToday(day) && !isSelected(day) ? 'text-indigo-600 font-bold' : ''}
            `}
          >
            {day}
            {hasTasks(day) && (
              <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected(day) ? 'bg-white/60' : 'bg-indigo-300'}`} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
