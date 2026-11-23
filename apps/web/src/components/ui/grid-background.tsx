import * as React from "react";
import { cn } from "@/lib/utils";

export interface GridBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  gridSize?: number;
  mask?: "radial" | "none";
  gridClassName?: string;
  maskClassName?: string;
}

export function GridBackground({
  children,
  gridSize = 40,
  mask = "radial",
  className,
  gridClassName,
  maskClassName,
  ...props
}: GridBackgroundProps) {
  return (
    <div
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden",
        className
      )}
      {...props}
    >
      <div
        style={{
          backgroundSize: `${gridSize}px ${gridSize}px`,
        }}
        className={cn(
          "pointer-events-none absolute inset-0 z-0",
          "[background-image:linear-gradient(to_right,rgba(0,0,0,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.06)_1px,transparent_1px)]",
          "dark:[background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)]",
          gridClassName
        )}
      />
      {mask === "radial" && (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 z-0 flex items-center justify-center",
            "[mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]",
            maskClassName
          )}
        />
      )}
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}

export default GridBackground;

