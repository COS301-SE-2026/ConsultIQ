export interface ChartSeries<T> {
    dataKey: keyof T;
    label?: string;
    colour?: string;
}

export interface BaseChartProps<T extends Record<string, any>> {
    data: T[];
    title: string;
    xAxisKey: keyof T;
    colours?: string[];
    yAxisUnit?: string; //whether it's % ,consultants,days etc
    yAxisDomain?: [number, number]; //range of the y axis. For example so 0-100 for percentage 
    valueToString?: (value: number) => string;
    emptyMessage?: string; //Message to be displayed when there is no data to be displayed
    className?: string;
}

export const DEFAULT_COLOURS = ["#002d62", "#c9a84c", "#1d6eb5", "#d7a007", "#3b82f6", "#93c5fd"];