import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface NeonButtonProps extends HTMLMotionProps<"button"> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    glow?: boolean;
    children?: React.ReactNode;
}

export const NeonButton = React.forwardRef<HTMLButtonElement, NeonButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, glow = true, children, ...props }, ref) => {
        const variants = {
            primary: 'bg-primary text-white border-transparent hover:bg-primary/90',
            secondary: 'bg-secondary text-white border-transparent hover:bg-secondary/90',
            outline: 'bg-transparent border-primary text-primary hover:bg-primary/10',
            ghost: 'bg-transparent border-transparent text-primary hover:bg-primary/10',
        };

        const sizes = {
            sm: 'h-8 px-3 text-xs',
            md: 'h-10 px-4 py-2',
            lg: 'h-12 px-6 text-lg',
        };

        return (
            <motion.button
                ref={ref}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                    'relative inline-flex items-center justify-center rounded-md border font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:pointer-events-none',
                    variants[variant],
                    sizes[size],
                    glow && variant !== 'ghost' && 'neon-border',
                    className
                )}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {children}
                {glow && variant === 'primary' && (
                    <div className="absolute inset-0 -z-10 bg-primary/20 blur-xl opacity-0 transition-opacity group-hover:opacity-100" />
                )}
            </motion.button>
        );
    }
);

NeonButton.displayName = 'NeonButton';
