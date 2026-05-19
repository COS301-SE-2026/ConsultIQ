import * as React from "react";

import { cn } from "../../lib/utils";

type ButtonVariant =
    | "default"
    | "secondary"
    | "outline"
    | "ghost"
    | "danger";

interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
}

const variantStyles: Record<ButtonVariant, string> = {
    default: `
        bg-[#C9A227]
        text-white
        hover:bg-[#b8921f]
    `,

    secondary: `
        bg-slate-100
        text-[#002D72]
        hover:bg-slate-200
    `,

    outline: `
        border
        border-slate-300
        bg-white
        text-[#002D72]
        hover:bg-slate-50
    `,

    ghost: `
        bg-transparent
        text-[#002D72]
        hover:bg-slate-100
    `,

    danger: `
        bg-red-500
        text-white
        hover:bg-red-600
    `,
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = "default",
            disabled,
            ...props
        },
        ref
    ) => {
        return (
            <button
                ref={ref}
                disabled={disabled}
                className={cn(
                    `
                    inline-flex
                    items-center
                    justify-center
                    rounded-xl
                    px-5
                    py-3
                    text-sm
                    font-medium
                    transition
                    outline-none

                    disabled:pointer-events-none
                    disabled:opacity-50
                    `,
                    variantStyles[variant],
                    className
                )}
                {...props}
            />
        );
    }
);

Button.displayName = "Button";

export { Button };