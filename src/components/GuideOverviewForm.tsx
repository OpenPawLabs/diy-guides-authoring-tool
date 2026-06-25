import { Button, Card } from "@heroui/react";
import {
  calloutTypes,
  createBlankCallout,
  createBlankToolItem,
  createBlankToolList,
  type GuideCalloutType,
  type GuideDraft,
} from "../lib/mdx/structuredGuide";
import {
  ReorderControls,
  Section,
  SelectField,
  TextAreaField,
  TextField,
} from "./GuideFormFields";
import { ToolItemThumbnailField } from "./ToolItemThumbnailField";

interface GuideOverviewFormProps {
  draft: GuideDraft;
  directory: FileSystemDirectoryHandle;
  updateDraft: (mutate: (draft: GuideDraft) => void) => void;
}

/**
 * Guide-level content that sits alongside the steps: intro copy, tools and parts
 * lists, and callouts. Rendered from the step navigator's Overview tab. The guide
 * header fields live in {@link GuideDetailsCard}.
 */
export function GuideOverviewForm({
  draft,
  directory,
  updateDraft,
}: GuideOverviewFormProps) {
  return (
    <div className="flex flex-col gap-4">
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
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_8rem_auto]">
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
                          <ToolItemThumbnailField
                            directory={directory}
                            thumbnail={item.thumbnail}
                            onChange={(thumbnail) =>
                              updateDraft((next) => {
                                next.toolLists[listIndex].items[itemIndex].thumbnail =
                                  thumbnail;
                              })
                            }
                          />
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
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
