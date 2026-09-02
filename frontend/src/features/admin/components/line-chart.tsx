import { LineChart as RechartsLineChart, Line, Tooltip, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { Card } from "../../../components/ui/card";
import {type BaseChartProps,type ChartSeries,DEFAULT_COLOURS } from "../types/chart.types";



interface LineGraphProps<T extends Record<string, any>>extends BaseChartProps<T> {
    lines: ChartSeries<T>[];
}



export default function LineGraph<T extends Record<string, any>>({
    data,
    title,
    xAxisKey,
    lines,
    colours= DEFAULT_COLOURS,
    yAxisUnit,
    yAxisDomain,
    valueToString = (v) => `${v}${yAxisUnit ?? ""}`,
    emptyMessage = "No data availale yet",
    className,
}: LineGraphProps<T>) {

    let hasData = false;

    if (data && data.length > 0) {
        for (const line of lines) {
            for (const item of data) {
                if (Number(item[line.dataKey]) > 0) {
                    hasData = true;
                    break;
                }
            }
            if (hasData) break;
        }

    }

    return (
        <Card className={`p-4 rounded-xl ${className ?? ""}`}>
            <h2 className="text-base font-semibold text-brand-blue ">{title}</h2>
            {!hasData ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-brand-muted!">
                    {emptyMessage}
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={280}>
                    <RechartsLineChart 
                        data={data}
                        margin={{top:8,right:12,left:-8,bottom:8}}
                        barGap={4}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                        <XAxis
                            dataKey={xAxisKey as string}
                            tick={{fontSize: 10, fill: "#6b7280"}}
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                            angle={-25}
                            textAnchor="end"
                            height={50}
                        />
                        <YAxis
                            unit={yAxisUnit}
                            domain={yAxisDomain}
                            tick={{fontSize: 10, fill: "#6b7280"}}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip formatter={(value) => valueToString(Number(value))} />
                        {lines.length > 1 && <Legend/>}
                        {lines.map((line,index) => (
                            <Line
                                key={String(line.dataKey)}
                                type="monotone"
                                dataKey={line.dataKey as string}
                                name={line.label ?? String(line.dataKey)}
                                stroke={line.colour ?? colours[index % DEFAULT_COLOURS?.length]}
                                strokeWidth={2}
                                dot={{r:3}}
                                activeDot={{r:5}}
                            />
                        ))}

                    </RechartsLineChart>
                </ResponsiveContainer>
            )}
        </Card>
    );
}