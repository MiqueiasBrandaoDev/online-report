'use client';

import { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
    value: number;
    duration?: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
}

export default function AnimatedCounter({
    value,
    duration = 1500,
    decimals = 0,
    prefix = '',
    suffix = '',
    className = ''
}: AnimatedCounterProps) {
    const [displayValue, setDisplayValue] = useState(0);
    const [hasAnimated, setHasAnimated] = useState(false);
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !hasAnimated) {
                    setHasAnimated(true);
                    animateValue(0, value, duration);
                }
            },
            { threshold: 0.1 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, [value, duration, hasAnimated]);

    const animateValue = (start: number, end: number, duration: number) => {
        const startTime = performance.now();

        const easeOutQuart = (t: number): number => {
            return 1 - Math.pow(1 - t, 4);
        };

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutQuart(progress);

            const currentValue = start + (end - start) * easedProgress;
            setDisplayValue(currentValue);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    };

    const formatNumber = (num: number): string => {
        if (decimals > 0) {
            return num.toFixed(decimals);
        }
        return Math.round(num).toLocaleString('pt-BR');
    };

    return (
        <span ref={ref} className={className}>
            {prefix}{formatNumber(displayValue)}{suffix}
        </span>
    );
}
