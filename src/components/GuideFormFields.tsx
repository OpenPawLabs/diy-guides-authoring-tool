import { Button, Card } from "@heroui/react";
import { useId } from "react";
import type { ReactNode } from "react";

/** Shared form primitives for the guide-level detail and overview forms. */

export function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="border border-default-200 shadow-sm">
      <Card.Header className="flex-row items-center justify-between gap-4">
        <Card.Title>{title}</Card.Title>
        {action}
      </Card.Header>
      <Card.Content className="space-y-4 p-4">{children}</Card.Content>
    </Card>
  );
}

export function TextField({
  label,
  value,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  type?: "text" | "number";
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-default-700" htmlFor={id}>
      {label}
      <input
        id={id}
        type={type}
        className={fieldClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  rows,
  onChange,
}: {
  label: string;
  value: string;
  rows: number;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-default-700" htmlFor={id}>
      {label}
      <textarea
        id={id}
        rows={rows}
        className={`${fieldClassName} resize-y font-mono leading-6`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  isDisabled = false,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  isDisabled?: boolean;
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-default-700" htmlFor={id}>
      {label}
      <select
        id={id}
        disabled={isDisabled}
        className={fieldClassName}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labelForOption(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ReorderControls({
  canMoveUp,
  canMoveDown,
  canRemove = true,
  removeLabel,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  canMoveUp: boolean;
  canMoveDown: boolean;
  canRemove?: boolean;
  removeLabel: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button isDisabled={!canMoveUp} variant="outline" onPress={onMoveUp}>
        Move up
      </Button>
      <Button isDisabled={!canMoveDown} variant="outline" onPress={onMoveDown}>
        Move down
      </Button>
      <Button
        isDisabled={!canRemove}
        variant="outline"
        className="text-danger"
        onPress={onRemove}
      >
        {removeLabel}
      </Button>
    </div>
  );
}

function labelForOption(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const fieldClassName =
  "rounded-xl border border-default-300 bg-white px-3 py-2 text-sm text-default-900 shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-200 disabled:bg-default-100 disabled:text-default-500";
