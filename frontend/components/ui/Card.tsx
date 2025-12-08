import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    neonBorder?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, neonBorder = false, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'glass-panel rounded-xl p-6 text-foreground transition-all',
                    neonBorder && 'hover:neon-border',
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('flex flex-col space-y-1.5 pb-4', className)} {...props} />
    )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h3 ref={ref} className={cn('text-2xl font-semibold leading-none tracking-tight neon-text', className)} {...props} />
    )
);
CardTitle.displayName = 'CardTitle';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('pt-0', className)} {...props} />
    )
);
CardContent.displayName = 'CardContent';
