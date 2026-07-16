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
        bg-brand-blue
        text-white
        hover:bg-[#4A5568]
    `,

    secondary: `
        bg-[#3C5A8A]
        text-[#002D72]
        hover:bg-[#4A5568]
    `,

    outline: `
        border
        border-solid
        border-brand-blue
        bg-white
        text-brand-blue
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