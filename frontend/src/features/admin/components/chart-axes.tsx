import { CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

interface ChartAxesProps {
    xAxiskey: string
    yAxisUnit?: string;
    yAxisDomain?: [number, number];
    xAxisHeight?: number;
    valueToString?: (value: number) => string;
}

export function ChartAxes({
    xAxiskey,
    yAxisUnit,
    yAxisDomain,
    valueToString,
    xAxisHeight = 50,
}: ChartAxesProps) {
    return (
        <>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
                dataKey={xAxiskey}
                tick={{ fontSize: 10, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={xAxisHeight}
            />
            <YAxis
                unit={yAxisUnit}
                domain={yAxisDomain}
                tick={{ fontSize: 10, fill: "#6b7280" }}
                axisLine={false}
                tickLine={false}
            />
            <Tooltip formatter={(value) =>{
                if(valueToString){
                    return valueToString(Number(value));
                }

                return yAxisUnit ? `${Number(value)}${yAxisUnit}`: Number(value);
            }} 
            />
        </>
    );
}