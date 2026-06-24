import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaDisplayRegion } from "@openpawlabs/diy-guides-ui";
import { CropEditorModal } from "../components/step-editor/CropEditorModal";

/** Display box of the full image: 400×450 for an 800×900 source (uniform 2× scale). */
const rootRect = {
  width: 400,
  height: 450,
  top: 0,
  left: 0,
  right: 400,
  bottom: 450,
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

function editor() {
  return screen.getByRole("application", { name: "Crop editor" });
}

function loadSource(width = 800, height = 900) {
  const img = editor().querySelector("img")!;
  Object.defineProperty(img, "naturalWidth", { value: width, configurable: true });
  Object.defineProperty(img, "naturalHeight", { value: height, configurable: true });
  fireEvent.load(img);
}

describe("CropEditorModal", () => {
  beforeEach(() => {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue(rootRect);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("explains the tool and disables reset until a region is set", () => {
    render(
      <CropEditorModal isOpen src="/photo.jpg" onClose={() => {}} onChange={vi.fn()} />,
    );
    expect(screen.getByText(/Drag the box/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Reset to center crop" }),
    ).toBeDisabled();
  });

  it("clears the region when reset is pressed", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <CropEditorModal
        isOpen
        src="/photo.jpg"
        region={{ x: 0, y: 0, width: 200 }}
        onClose={() => {}}
        onChange={onChange}
      />,
    );

    const reset = screen.getByRole("button", { name: "Reset to center crop" });
    expect(reset).toBeEnabled();
    await user.click(reset);
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it("reports a region in source pixels when a handle is dragged", () => {
    const onChange = vi.fn();
    render(
      <CropEditorModal isOpen src="/photo.jpg" onClose={() => {}} onChange={onChange} />,
    );
    loadSource();

    const seHandle = editor().querySelectorAll(".crop-handle")[3];
    firePointer("pointerdown", seHandle, 400, 375);
    firePointer("pointermove", editor(), 200, 375);
    firePointer("pointerup", editor());

    expect(onChange).toHaveBeenCalledWith<[MediaDisplayRegion]>({
      x: 0,
      y: 150,
      width: 400,
    });
  });
});
