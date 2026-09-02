import { Pie, PieChart, Tooltip, Sector, type PieSectorShapeProps, ResponsiveContainer } from "recharts";
import { Card } from "../../../components/ui/card";

export type GenericDataItem = Record<string, unknown>;

interface DonutChartProps<T extends object> {
   readonly data: T[];
   readonly title: string;
   readonly dataKey: keyof T ;
   readonly nameKey: keyof T ;
   readonly colours?: string[];
   readonly valueToString?: (value: number) => string;
   readonly emptyMessage?: string;

}

interface WithOptionalColour{
    colour?: string;
}


const DEFAULT_COLOURS = ["#002d62", "#c9a84c", "#1d6eb5", "#d7a007", "#3b82f6", "#93c5fd"];

export default function DonutChart<T extends object>({ data,
    title,
    dataKey,
    nameKey,
    colours = DEFAULT_COLOURS,
    valueToString = (v) => `${v}`,
    emptyMessage = "No data availale yet",
}: DonutChartProps<T>) {
    let hasData = false;

    if (data && data.length > 0) {
        for (const item of data) {
            if (Number(item[dataKey]) > 0) {
                hasData = true;
                break;
            }
        }
    }

    const colourFor = (index: number, entry: T) =>
        (entry as T & WithOptionalColour).colour ?? colours[index % colours.length];

    const ColouredSlice = (props: PieSectorShapeProps) => {
        const index = props.index ?? 0;
        return <Sector {...props} fill={colourFor(index, data[index])} />;
    };

    return (
        <Card className="p-4 rounded-xl">
            <h2 className="text-lg text-brand-blue">{title}</h2>
            {!hasData ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-brand-muted!">
                    {emptyMessage}
                </div>
            ) : (
                <>
                    <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                innerRadius={44}
                                dataKey={dataKey as string}
                                nameKey={nameKey as string}
                                paddingAngle={2}
                                shape={ColouredSlice}
                            />

                            <Tooltip formatter={(value) => valueToString(Number(value))} />
                        </PieChart>
                    </ResponsiveContainer>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-sm mt-3">
                        {data.map((entry, index) => (
                            <div key={index} className="flex items-center gap-1.5 min-w-0">
                                <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" 
                                    style={{
                                        backgroundColor: colourFor(index,entry)
                                    }}
                                />
                                <span className="text-brand-muted! truncate">{String(entry[nameKey])}</span> 
                            </div>
                        ))}
                    </div>
                </>
            )}

        </Card>
    );
}

