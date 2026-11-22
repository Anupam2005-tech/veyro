import { cn } from '../lib/utils';

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-panel bg-theme-glass motion-reduce:animate-none', className)}
    />
  );
}
