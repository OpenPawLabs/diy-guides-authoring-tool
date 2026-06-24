import { Button, Card } from "@heroui/react";
import { useId } from "react";
import type { ReactNode } from "react";
import {
  calloutTypes,
  createBlankCallout,
  createBlankToolItem,
  createBlankToolList,
  guideDifficulties,
  type GuideCalloutType,
  type GuideDifficulty,
  type GuideDraft,
} from "../lib/mdx/structuredGuide";

interface GuideDetailsFormProps {
  draft: GuideDraft;
  updateDraft: (mutate: (draft: GuideDraft) => void) => void;
}

/**
 * Form for guide-level details (header, intro, tools/parts, callouts). Steps are
 * edited inline on the rendered guide via the step editor, not here.
 */
export function GuideDetailsForm({ draft, updateDraft }: GuideDetailsFormProps) {
  return (
    <div className="flex flex-col gap-4">
      <Section title="Guide details">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Title"
            value={draft.header.title}
            onChange={(value) =>
              updateDraft((next) => {
                next.header.title = value;
              })
            }
          />
          <SelectField
            label="Difficulty"
            value={draft.header.difficulty}
            options={guideDifficulties}
            onChange={(value) =>
              updateDraft((next) => {
                next.header.difficulty = value as GuideDifficulty;
              })
            }
          />
          <TextField
            label="Time estimate"
            value={draft.header.timeEstimate}
            onChange={(value) =>
              updateDraft((next) => {
                next.header.timeEstimate = value;
              })
            }
          />
          <TextField
            label="Meta"
            value={draft.header.meta}
            onChange={(value) =>
              updateDraft((next) => {
                next.header.meta = value;
              })
            }
          />
        </div>
      </Section>

      <Section title="Intro">
        <TextAreaField
          label="Intro content"
          value={draft.intro}
          rows={5}
          onChange={(value) =>
            updateDraft((next) => {
              next.intro = value;
            })
          }
        />
      </Section>

      <Section
        title="Tools and parts"
        action={
          <Button
            variant="secondary"
            onPress={() =>
              updateDraft((next) => {
                next.toolLists.push(createBlankToolList());
              })
            }
          >
            Add list
          </Button>
        }
      >
        {draft.toolLists.length === 0 ? (
          <p className="rounded-xl border border-dashed border-default-300 p-4 text-sm text-default-600">
            No tools or parts lists yet.
          </p>
        ) : (
          <div className="space-y-4">
            {draft.toolLists.map((toolList, listIndex) => (
              <Card key={toolList.id} className="border border-default-200 shadow-sm">
                <Card.Content className="space-y-4 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1">
                      <TextField
                        label="List title"
                        value={toolList.title}
                        onChange={(value) =>
                          updateDraft((next) => {
                            next.toolLists[listIndex].title = value;
                          })
                        }
                      />
                    </div>
                    <ReorderControls
                      canMoveUp={listIndex > 0}
                      canMoveDown={listIndex < draft.toolLists.length - 1}
                      removeLabel="Remove list"
                      onMoveUp={() =>
                        updateDraft((next) => {
                          moveItem(next.toolLists, listIndex, listIndex - 1);
                        })
                      }
                      onMoveDown={() =>
                        updateDraft((next) => {
                          moveItem(next.toolLists, listIndex, listIndex + 1);
                        })
                      }
                      onRemove={() =>
                        updateDraft((next) => {
                          next.toolLists.splice(listIndex, 1);
                        })
                      }
                    />
                  </div>

                  <div className="space-y-3">
                    {toolList.items.map((item, itemIndex) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-default-200 bg-default-50 p-3"
                      >
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem]">
                          <TextField
                            label="Item name"
                            value={item.name}
                            onChange={(value) =>
                              updateDraft((next) => {
                                next.toolLists[listIndex].items[itemIndex].name = value;
                              })
                            }
                          />
                          <TextField
                            label="Quantity"
                            type="number"
                            value={item.quantity?.toString() ?? ""}
                            onChange={(value) =>
                              updateDraft((next) => {
                                next.toolLists[listIndex].items[itemIndex].quantity =
                                  parseOptionalNumber(value);
                              })
                            }
                          />
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <TextField
                            label="Link"
                            value={item.href ?? ""}
                            onChange={(value) =>
                              updateDraft((next) => {
                                next.toolLists[listIndex].items[itemIndex].href =
                                  value || undefined;
                              })
                            }
                          />
                          <TextField
                            label="Price"
                            value={item.price ?? ""}
                            onChange={(value) =>
                              updateDraft((next) => {
                                next.toolLists[listIndex].items[itemIndex].price =
                                  value || undefined;
                              })
                            }
                          />
                          <TextField
                            label="Thumbnail"
                            value={item.thumbnail ?? ""}
                            onChange={(value) =>
                              updateDraft((next) => {
                                next.toolLists[listIndex].items[itemIndex].thumbnail =
                                  value || undefined;
                              })
                            }
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            isDisabled={itemIndex === 0}
                            variant="outline"
                            onPress={() =>
                              updateDraft((next) => {
                                moveItem(
                                  next.toolLists[listIndex].items,
                                  itemIndex,
                                  itemIndex - 1,
                                );
                              })
                            }
                          >
                            Move up
                          </Button>
                          <Button
                            isDisabled={itemIndex === toolList.items.length - 1}
                            variant="outline"
                            onPress={() =>
                              updateDraft((next) => {
                                moveItem(
                                  next.toolLists[listIndex].items,
                                  itemIndex,
                                  itemIndex + 1,
                                );
                              })
                            }
                          >
                            Move down
                          </Button>
                          <Button
                            variant="outline"
                            className="text-danger"
                            onPress={() =>
                              updateDraft((next) => {
                                next.toolLists[listIndex].items.splice(itemIndex, 1);
                              })
                            }
                          >
                            Remove item
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant="secondary"
                    onPress={() =>
                      updateDraft((next) => {
                        next.toolLists[listIndex].items.push(createBlankToolItem());
                      })
                    }
                  >
                    Add item
                  </Button>
                </Card.Content>
              </Card>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Callouts"
        action={
          <Button
            variant="secondary"
            onPress={() =>
              updateDraft((next) => {
                next.callouts.push(createBlankCallout());
              })
            }
          >
            Add callout
          </Button>
        }
      >
        {draft.callouts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-default-300 p-4 text-sm text-default-600">
            No callouts yet.
          </p>
        ) : (
          <div className="space-y-4">
            {draft.callouts.map((callout, calloutIndex) => (
              <Card key={callout.id} className="border border-default-200 shadow-sm">
                <Card.Content className="space-y-4 p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <SelectField
                      label="Callout type"
                      value={callout.type}
                      options={calloutTypes}
                      onChange={(value) =>
                        updateDraft((next) => {
                          next.callouts[calloutIndex].type = value as GuideCalloutType;
                        })
                      }
                    />
                    <TextField
                      label="Callout title"
                      value={callout.title}
                      onChange={(value) =>
                        updateDraft((next) => {
                          next.callouts[calloutIndex].title = value;
                        })
                      }
                    />
                  </div>
                  <TextAreaField
                    label="Callout content"
                    value={callout.body}
                    rows={4}
                    onChange={(value) =>
                      updateDraft((next) => {
                        next.callouts[calloutIndex].body = value;
                      })
                    }
                  />
                  <ReorderControls
                    canMoveUp={calloutIndex > 0}
                    canMoveDown={calloutIndex < draft.callouts.length - 1}
                    removeLabel="Remove callout"
                    onMoveUp={() =>
                      updateDraft((next) => {
                        moveItem(next.callouts, calloutIndex, calloutIndex - 1);
                      })
                    }
                    onMoveDown={() =>
                      updateDraft((next) => {
                        moveItem(next.callouts, calloutIndex, calloutIndex + 1);
                      })
                    }
                    onRemove={() =>
                      updateDraft((next) => {
                        next.callouts.splice(calloutIndex, 1);
                      })
                    }
                  />
                </Card.Content>
              </Card>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
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

function TextField({
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

function TextAreaField({
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

function SelectField<T extends string>({
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

function ReorderControls({
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

function moveItem<T>(items: T[], from: number, to: number): void {
  if (to < 0 || to >= items.length) {
    return;
  }

  const [item] = items.splice(from, 1);
  items.splice(to, 0, item);
}

function parseOptionalNumber(value: string): number | undefined {
  const number = Number(value);
  return value.trim() !== "" && Number.isFinite(number) ? number : undefined;
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
