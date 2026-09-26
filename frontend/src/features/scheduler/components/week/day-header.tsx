

export interface DayHeaderProps {
    dayOfWeek: string;
    date: string;
    isToday?: boolean;
    isHoliday?: boolean;
    holidayName?: string;
    totalHours?: number;
}

export default function Dayheader({
    dayOfWeek,
    date,
    isToday = false,
    isHoliday = false,
    holidayName,
    totalHours = 0,
}:DayHeaderProps){

    const isOverworked = totalHours > 8;

    const getBgColour = () => {
        if (isHoliday) return "#F3F4F6";
        if (isToday) return "FAFBFF";
        return "#FFFFFF";
    };

    return (
        <div
            className="flex-1 border-l py-2 px-1 flex flex-col items-center gap-0.5 select-none"
            style={{
                borderColor: '#E2E8F0',
                backgroundColor: getBgColour(),
            }}
        >
            <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: isToday ? '#002D62' : '#6B7280' }}
            >
                {dayOfWeek.slice(0, 3)}
            </span>

            <span
                className="text-sm font-bold"
                style={{ color: isToday ? '#002D62' : '#1F2937' }}
            >
                {date}
            </span>

            <div className="flex items-center gap-1 mt-0.5">
                {isHoliday ? (
                    <span
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: '#E5E7EB', color: '#374151' }}
                    >
                        {holidayName || "Public Holiday"}
                    </span>
                ) : (
                    <span
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{
                            backgroundColor: isOverworked ? '#FEE2E2' : '#F1F5F9',
                            color: isOverworked ? '#991B1B' : '#6B7280',
                        }}
                    >
                        {totalHours.toFixed(1)}h
                    </span>
                )}

                {isToday && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        TODAY
                    </span>
                )}

            </div>
        </div>
    );

};