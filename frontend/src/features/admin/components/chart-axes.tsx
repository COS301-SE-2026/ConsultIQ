import { CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";

interface ChartAxesProps {
    xAxiskey: string
    yAxisUnit?: string;
    yAxisDomain?: [number, number];
    xAxisHeight?: number;
    valueToString?: (value: number) => string;
    truncateLength?: number,
}

interface TruncatedXAxisTickProps {
   readonly x?: string | number;
   readonly y?: string | number;
   readonly payload?: { value?: unknown };
   readonly truncateLength: number;
  readonly  [key:string]: unknown;
}

function TruncatedXAxisTick({ x = 0, y = 0, payload, truncateLength }: TruncatedXAxisTickProps) {
    const label = String(payload?.value ?? "");
    const truncateLabel = 
        label.length > truncateLength ?
            `${label.slice(0, truncateLength)}...`
            : label;

    const xPosition = Number(x);
    const yPosition= Number(y);

    return (
        <text
            x={xPosition}
            y={yPosition}
            textAnchor="end"
            fill="#6b7280"
            fontSize={10}
            transform={`rotate(-35, ${xPosition}, ${yPosition})`}
        >
            {truncateLabel}
        </text>
    );

}


export function ChartAxes({
    xAxiskey,
    yAxisUnit,
    yAxisDomain,
    valueToString,
    xAxisHeight = 50,
    truncateLength = 12,
}: ChartAxesProps) {

    return (
        <>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
                dataKey={xAxiskey}
                tick={(props) => (
                    <TruncatedXAxisTick
                        {...props}
                        truncateLength={truncateLength}
                    />                
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
            <Tooltip formatter={(value) => {
                if (valueToString) {
                    return valueToString(Number(value));
                }

                return yAxisUnit ? `${Number(value)}${yAxisUnit}` : Number(value);
            }}
            />
        </>
    );
}