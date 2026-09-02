import { BarChart as RechartsbarChart, Bar, Tooltip, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts";
import { Card } from "../../../components/ui/card";
import {type BaseChartProps,type ChartSeries,DEFAULT_COLOURS } from "../types/chart.types";



interface BarGraphProps<T extends Record<string, any>> extends BaseChartProps<T>{
    bars: ChartSeries<T>[];
}



export default function BarGraph<T extends Record<string, any>>({
    data,
    title,
    xAxisKey,
    bars,
    colours= DEFAULT_COLOURS,
    yAxisUnit,
    yAxisDomain,
    valueToString = (v) => `${v}${yAxisUnit ?? ""}`,
    emptyMessage = "No data availale yet",
}: BarGraphProps<T>) {

    let hasData = false;

    if (data && data.length > 0) {
        for (const bar of bars) {
            for (const item of data) {
                if (Number(item[bar.dataKey]) > 0) {
                    hasData = true;
                    break;
                }
            }
            if (hasData) break;
        }

    }

    return (
        <Card className="p-4 rounded-xl">
            <h2 className="text-lg text-brand-blue">{title}</h2>
            {!hasData ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-brand-muted!">
                    {emptyMessage}
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={240}>
                    <RechartsbarChart 
                        data={data}
                        margin={{top:4,right:8,left:-16,bottom:0}}
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
                        {bars.length > 1 && <Legend/>}
                        {bars.map((bar,index) => (
                            <Bar
                                key={String(bar.dataKey)}
                                dataKey={bar.dataKey as string}
                                name={bar.label ?? String(bar.dataKey)}
                                fill={bar.colour ?? colours[index % DEFAULT_COLOURS?.length]}
                                radius={[3,3,0,0]}
                                maxBarSize={32}
                            />
                        ))}

                    </RechartsbarChart>
                </ResponsiveContainer>
            )}
        </Card>
    );
}