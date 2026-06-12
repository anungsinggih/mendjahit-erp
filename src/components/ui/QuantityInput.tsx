import React from 'react'
import { Button } from './Button'
import { Icons } from './Icons'

interface QuantityInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    containerClassName?: string
    onIncrement?: () => void
    onDecrement?: () => void
}

export const QuantityInput = React.forwardRef<HTMLInputElement, QuantityInputProps>(({
    label,
    className = '',
    containerClassName = '',
    onIncrement,
    onDecrement,
    ...props
}, ref) => {
    return (
        <div className={`flex flex-col gap-1.5 mb-3 w-full ${containerClassName}`}>
            {label && <label className="text-sm font-medium text-[var(--text-main)]">{label}</label>}
            <div className="flex items-center gap-1">
                <Button
                    type="button"
                    onClick={onDecrement}
                    className="h-10 w-8 px-0 flex-shrink-0"
                    variant="outline"
                >
                    <Icons.Minus className="h-4 w-4" />
                </Button>
                <input
                    ref={ref}
                    className={`flex h-10 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-center placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-[var(--primary)] transition-all duration-200 disabled:opacity-50 disabled:bg-gray-50 shadow-sm hover:border-gray-300 ${className}`}
                    {...props}
                />
                <Button
                    type="button"
                    onClick={onIncrement}
                    className="h-10 w-8 px-0 flex-shrink-0"
                    variant="outline"
                >
                    <Icons.Plus className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
})
QuantityInput.displayName = 'QuantityInput'