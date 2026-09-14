import { CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

interface ChartAxesProps {
    xAxiskey: string
    yAxisUnit?: string;
    yAxisDomain?: [number, number];
    xAxisHeight?: number;
    valueToString?: (value: number) => string;
    truncateLength?: number,
}

export function ChartAxes({
    xAxiskey,
    yAxisUnit,
    yAxisDomain,
    valueToString,
    xAxisHeight = 50,
    truncateLength= 12,
}: ChartAxesProps) {

    const truncateLabel = (label: string) => {
        return label.length > truncateLength ? 
        `${label.slice(0, truncateLength)}...`
        : label;
    }
    return (
        <>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
                dataKey={xAxiskey}
                tick={({x,y,payload}) => (
                    <text
                         x={x}
                        y={y}
                        textAnchor="end"
                        fill="#6b7280" 
                        fontSize={10}
                        transform={`rotate(-35, ${x}, ${y})`}
                    >
                       {truncateLabel(String(payload.value))}
                    </text>
                )}
                axisLine={false}
                tickLine={false}
                interval={0}
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