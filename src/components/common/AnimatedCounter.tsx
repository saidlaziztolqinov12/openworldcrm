import React, { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  durationMs?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  durationMs = 900,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = ''
}) => {
  const [displayValue, setDisplayValue] = useState<number>(0);
  const isFirstMount = useRef(true);
  const previousValue = useRef(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    // On first mount start from 0; on subsequent updates start from previous value
    const startVal = isFirstMount.current ? 0 : previousValue.current;
    const targetVal = typeof value === 'number' && !isNaN(value) ? value : 0;
    isFirstMount.current = false;
    previousValue.current = targetVal;

    let frameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / durationMs, 1);

      // Smooth ease-out exponential / cubic curve
      const easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startVal + (targetVal - startVal) * easeOut;

      setDisplayValue(current);

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(targetVal);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [value, durationMs]);

  const formattedValue = decimals > 0
    ? displayValue.toFixed(decimals)
    : Math.round(displayValue).toLocaleString();

  return (
    <span className={`inline-block tabular-nums font-mono font-inherit ${className}`}>
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
};
