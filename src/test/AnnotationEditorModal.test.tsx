import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { COLORS, type MediaAnnotation } from "@openpawlabs/diy-guides-ui";
import { AnnotationEditorModal } from "../components/step-editor/AnnotationEditorModal";

const frameRect = {
  width: 400,
  height: 300,
  top: 0,
  left: 0,
  right: 400,
  bottom: 300,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as DOMRect;

/** jsdom's PointerEvent drops coordinates; dispatch a MouseEvent under the pointer name. */
function firePointer(
  type: "pointerdown" | "pointermove" | "pointerup",
  target: Element,
  clientX = 0,
  clientY = 0,
) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY });
  Object.defineProperty(event, "pointerId", { value: 1, configurable: true });
  fireEvent(target, event);
}

/** Stateful host so the modal's controlled annotations and selection round-trip. */
function Harness() {
  const [annotations, setAnnotations] = useState<MediaAnnotation[]>([]);
  return (
    <AnnotationEditorModal
      isOpen
      src="/photo.jpg"
      annotations={annotations}
      onClose={() => {}}
      onChange={(recipe) =>
        setAnnotations((prev) => {
          const next = structuredClone(prev);
          recipe(next);
          return next;
        })
      }
    />
  );
}

describe("AnnotationEditorModal", () => {
  beforeEach(() => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(frameRect);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function canvas() {
    return screen.getByRole("application", { name: "Annotation editor" });
  }

  it("renders the tools and color swatches", () => {
    render(<Harness />);
    expect(screen.getByRole("button", { name: "Select" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Point" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Circle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rectangle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "RED color" })).toBeInTheDocument();
  });

  it("adds a point, then edits and recolors it through the inspector", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.getByLabelText("Tooltip")).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Point" }));
    firePointer("pointerdown", canvas(), 200, 150);
    firePointer("pointerup", canvas());

    expect(screen.getByLabelText("Label")).toBeInTheDocument();
    expect(screen.getByLabelText("Tooltip")).toBeEnabled();
    const tooltip = screen.getByLabelText("Tooltip");
    await user.type(tooltip, "Battery");

    const marker = screen.getByRole("img", { name: "Battery" });
    expect(marker).toHaveStyle({ backgroundColor: COLORS.RED });

    await user.click(screen.getByRole("button", { name: "GREEN color" }));
    expect(screen.getByRole("img", { name: "Battery" })).toHaveStyle({
      backgroundColor: COLORS.GREEN,
    });
  });

  it("deletes the selected annotation", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "Point" }));
    firePointer("pointerdown", canvas(), 200, 150);
    firePointer("pointerup", canvas());
    await user.type(screen.getByLabelText("Tooltip"), "Clip");
    expect(screen.getByRole("img", { name: "Clip" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.queryByRole("img", { name: "Clip" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Tooltip")).toBeDisabled();
    expect(screen.getByLabelText("Tooltip")).toHaveValue("");
  });
});
