import { useEffect, useState } from "react";
import { Button, Modal, cn } from "@heroui/react";
import {
  COLORS,
  MediaFigure,
  type AnnotationTool,
  type MediaAnnotation,
  type MediaDisplayRegion,
} from "@openpawlabs/diy-guides-ui";
import {
  createDraftId,
  guideColors,
  type GuideColor,
} from "../../lib/mdx/structuredGuide";

interface AnnotationEditorModalProps {
  isOpen: boolean;
  /** Displayable source for the image being annotated. */
  src: string;
  /** 4:3 crop in source pixels; matches the step preview when set. */
  displayRegion?: MediaDisplayRegion;
  annotations: MediaAnnotation[];
  onClose: () => void;
  /** Apply an in-place mutation to the image's annotation list. */
  onChange: (recipe: (annotations: MediaAnnotation[]) => void) => void;
}

const TOOLS: { tool: AnnotationTool; label: string }[] = [
  { tool: "select", label: "Select" },
  { tool: "point", label: "Point" },
  { tool: "circle", label: "Circle" },
  { tool: "rectangle", label: "Rectangle" },
];

/**
 * A minimal, Photoshop-style editor for an image's annotation markers. It owns the
 * active tool, the color for new shapes, and the current selection, and drives the
 * library's interactive `MediaFigure` canvas — the figure reports geometry while this
 * modal handles tool/color chrome, the selected-marker inspector, and persistence.
 */
export function AnnotationEditorModal({
  isOpen,
  src,
  displayRegion,
  annotations,
  onClose,
  onChange,
}: AnnotationEditorModalProps) {
  const [tool, setTool] = useState<AnnotationTool>("select");
  const [color, setColor] = useState<GuideColor>("RED");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRerenderDiv, setShowRerenderDiv] = useState<boolean>(false);

  const selected = annotations.find((annotation) => annotation.id === selectedId);
  const isPoint = selected != null && (selected.type ?? "point") === "point";

  const updateSelected = (mutate: (annotation: MediaAnnotation) => void) => {
    if (!selectedId) return;
    onChange((list) => {
      const target = list.find((annotation) => annotation.id === selectedId);
      if (target) {
        mutate(target);
      }
    });
  };

  const handleColor = (next: GuideColor) => {
    setColor(next);
    updateSelected((annotation) => {
      annotation.color = next;
    });
  };

  // 200ms after the modal is opened opened display a 1px div to force css recalculation to display the image with the proper display region.
  // (on initial load the display region displays slightly cropped and smaller than it should be, so we force a rerender)
  // yeah its hacky, but because of css fuckery its the easiest way to do this and idgaf
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setShowRerenderDiv(true);
      }, 200);
    } else if (!isOpen && showRerenderDiv) {
      setShowRerenderDiv(false);
    }
  }, [isOpen, showRerenderDiv]);
  

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="cover">
          <Modal.Dialog className="flex max-h-[100dvh] flex-col">
            <Modal.Header className="shrink-0">
              <Modal.Heading>Edit annotations
                <Button className="float-right" variant="primary" onPress={onClose}>
                  Done
                </Button>
              </Modal.Heading>
              
            </Modal.Header>
            <Modal.Body className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                <div className="flex items-center gap-1" role="group" aria-label="Annotation tool">
                  {TOOLS.map((option) => (
                    <button
                      key={option.tool}
                      type="button"
                      aria-pressed={tool === option.tool}
                      onClick={() => setTool(option.tool)}
                      className={cn(
                        "rounded-md border px-2.5 py-1 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        tool === option.tool
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-default-200 hover:border-accent",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5" role="group" aria-label="Annotation color">
                  {guideColors.map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-label={`${option} color`}
                      aria-pressed={color === option}
                      onClick={() => handleColor(option)}
                      className={cn(
                        "size-5 rounded-full ring-offset-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                        color === option
                          ? "ring-2 ring-accent"
                          : "hover:ring-2 hover:ring-default-300",
                      )}
                      style={{ backgroundColor: COLORS[option] }}
                    />
                  ))}
                </div>
              </div>

              {showRerenderDiv && (<div style={{ height: "1px" }} />) }

              <div className="min-h-0 w-full flex-1" style={{ containerType: "size" }}>
                <MediaFigure
                  className="m-0 flex h-full w-full items-center justify-center gap-0 [&>div]:h-auto [&>div]:w-[min(100cqw,calc(100cqh*4/3))]"
                  src={src}
                  displayRegion={displayRegion}
                  annotations={annotations}
                  annotationEditing={{
                    tool,
                    color,
                    selectedId,
                    onSelect: setSelectedId,
                    onAdd: (annotation) => {
                      const id = createDraftId("annotation");
                      onChange((list) => void list.push({ ...annotation, id }));
                      setSelectedId(id);
                      setTool("select");
                    },
                    onChange: (id, annotation) =>
                      onChange((list) => {
                        const index = list.findIndex((item) => item.id === id);
                        if (index >= 0) {
                          list[index] = { ...annotation, id };
                        }
                      }),
                    onRemove: (id) => {
                      onChange((list) => {
                        const index = list.findIndex((item) => item.id === id);
                        if (index >= 0) {
                          list.splice(index, 1);
                        }
                      });
                      setSelectedId(null);
                    },
                  }}
                />
              </div>

              <div className="flex shrink-0 flex-col gap-3 rounded-lg border border-default-200 bg-default-50 p-3 sm:flex-row sm:items-end">
                {isPoint && (
                  <label className="flex flex-1 flex-col gap-1 text-sm">
                    <span className="font-medium text-default-600">Label</span>
                    <input
                      type="text"
                      value={selected ? pointLabel(selected) : ""}
                      placeholder="e.g. 1 or A"
                      onChange={(event) => {
                        if (!selected) return;
                        const value = event.target.value;
                        updateSelected((annotation) => {
                          if (annotation.type == null || annotation.type === "point") {
                            annotation.label = value || undefined;
                          }
                        });
                      }}
                      className="rounded-md border border-default-200 bg-background px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      disabled={!selected}
                    />
                  </label>
                )}
                <label className="flex flex-1 flex-col gap-1 text-sm">
                  <span className="font-medium text-default-600">Tooltip</span>
                  <input
                    type="text"
                    value={selected ? (selected.title ?? "") : ""}
                    placeholder="Accessible description"
                    onChange={(event) => {
                      if (!selected) return;
                      const value = event.target.value;
                      updateSelected((annotation) => {
                        annotation.title = value || undefined;
                      });
                    }}
                    className="rounded-md border border-default-200 bg-background px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    disabled={!selected}
                  />
                </label>
                <Button
                  variant="danger"
                  onPress={() => {
                    if (!selected) return;
                    onChange((list) => {
                      const index = list.findIndex((item) => item.id === selectedId);
                      if (index >= 0) {
                        list.splice(index, 1);
                      }
                    });
                    setSelectedId(null);
                  }}
                  isDisabled={!selected}
                >
                  Delete
                </Button>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function pointLabel(annotation: MediaAnnotation): string {
  if ((annotation.type ?? "point") !== "point") {
    return "";
  }
  const { label } = annotation as { label?: unknown };
  return typeof label === "string" || typeof label === "number" ? String(label) : "";
}
