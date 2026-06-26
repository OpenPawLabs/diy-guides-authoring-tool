import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { GuideFullPreviewRoute } from "../pages/GuideFullPreviewRoute";
import { resetIndexedDb } from "./resetIndexedDb";

beforeEach(resetIndexedDb);

describe("GuideFullPreviewRoute", () => {
  it("redirects to the home page when the guide id is unknown", async () => {
    render(
      <MemoryRouter initialEntries={["/guide/missing/preview"]}>
        <Routes>
          <Route path="/" element={<div>Guides home</div>} />
          <Route path="/guide/:id/preview" element={<GuideFullPreviewRoute />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("Guides home")).toBeInTheDocument(),
    );
  });
});
