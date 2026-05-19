import * as React from "react";

import { cn } from "../../lib/utils";

type BadgeVariant =
    | "default"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "outline";

interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement> {
    variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
    default: `
        bg-[#002D72]
        text-white
    `,

    secondary: `
        bg-slate-100
        text-slate-700
    `,

    success: `
        bg-green-100
        text-green-700
    `,

    warning: `
        bg-yellow-100
        text-yellow-700
    `,

    danger: `
        bg-red-100
        text-red-700
    `,

    outline: `
        border
        border-slate-300
        bg-white
        text-slate-700
    `,
};

function Badge({
    className,
    variant = "default",
    ...props
}: Readonly<BadgeProps>) {
    return (
        <div
            className={cn(
                `
                inline-flex
                items-center
                rounded-full
                px-3
                py-1
                text-xs
                font-medium
                transition
                `,
                variantStyles[variant],
                className
            )}
            {...props}
        />
    );
}

export { Badge };