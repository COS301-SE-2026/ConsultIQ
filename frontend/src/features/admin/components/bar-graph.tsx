import { BarChart as RechartsbarChart, Bar, Legend, ResponsiveContainer } from "recharts";
import { Card } from "../../../components/ui/card";
import {type BaseChartProps,type ChartSeries,DEFAULT_COLOURS } from "../types/chart.types";
import { ChartAxes } from "./chart-axes";


interface BarGraphProps<T extends object> extends BaseChartProps<T>{
    bars: ChartSeries<T>[];
}



export default function BarGraph<T extends object>({
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
                        <ChartAxes
                            xAxiskey={xAxisKey as string}
                            yAxisUnit={yAxisUnit}
                            yAxisDomain={yAxisDomain}
                            valueToString={(value) => valueToString(Number(value))}
                        />
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