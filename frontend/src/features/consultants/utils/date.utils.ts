export const formatDateInput = (value: string) => {
    const v = value.replace(/\D/g, "");
    if (v.length >= 5) {
        return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4, 8)}`;
    } else if (v.length >= 3) {
        return `${v.slice(0, 2)}/${v.slice(2)}`;
    }
    return v;
};

export const parseDate = (dateStr: string) => {
    const parts = dateStr.split("/");
    if (parts.length === 3 && parts[2].length === 4) {
        return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
    }
    return null;
};

export const validateDateRange = (startDate: string, endDate: string) => {
    const parsedStart = parseDate(startDate);
    const parsedEnd = parseDate(endDate);
    
    if (startDate && !parsedStart) {
        return "Please enter a valid Start Date (DD/MM/YYYY)";
    }
    if (endDate && !parsedEnd) {
        return "Please enter a valid End Date (DD/MM/YYYY)";
    }
    if (parsedStart && parsedEnd && parsedEnd < parsedStart) {
        return "End date cannot be before start date";
    }
    return "";
};