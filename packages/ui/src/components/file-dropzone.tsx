'use client';

import * as React from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '../lib/utils';
import { VeyroButton } from './button';

export interface FileDropzoneProps {
  id: string;
  label: string;
  hint?: string;
  accept: string;
  value?: File | null;
  progress?: number;
  error?: string;
  onChange: (file: File | null) => void;
  className?: string;
}

export function FileDropzone({
  id,
  label,
  hint,
  accept,
  value,
  progress,
  error,
  onChange,
  className,
}: FileDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);

  function selectFiles(files: FileList | null) {
    onChange(files?.[0] ?? null);
  }

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        aria-label={label}
        tabIndex={-1}
        className="sr-only"
        onChange={(event) => selectFiles(event.currentTarget.files)}
      />
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          selectFiles(event.dataTransfer.files);
        }}
        className={cn(
          'rounded-card border border-dashed p-5 text-center transition-colors',
          dragging ? 'border-theme-accent bg-theme-glass' : 'border-theme-border bg-theme-surface',
          error ? 'border-[color:var(--theme-error)]' : ''
        )}
      >
        <UploadCloud aria-hidden="true" className="mx-auto h-6 w-6 text-theme-accent" />
        <p className="mt-3 text-sm font-semibold text-theme-text">{label}</p>
        {hint ? <p className="mt-1 text-xs text-theme-muted">{hint}</p> : null}
        {value ? (
          <p className="mt-3 truncate text-xs font-medium text-theme-text">{value.name}</p>
        ) : null}
        {typeof progress === 'number' ? (
          <div className="mx-auto mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-theme-glass-strong">
            <div
              className="h-full rounded-full bg-theme-accent transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        ) : null}
        <VeyroButton
          type="button"
          variant="secondary"
          size="sm"
          className="mt-4"
          aria-label={`Choose file — ${label}`}
          onClick={() => inputRef.current?.click()}
        >
          {value ? 'Choose another file' : 'Choose file'}
        </VeyroButton>
      </div>
      {error ? (
        <p role="alert" className="text-xs font-medium text-[color:var(--theme-error)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
