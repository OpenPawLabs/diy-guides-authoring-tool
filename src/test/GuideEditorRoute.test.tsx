import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { GuideEditorRoute } from "../pages/GuideEditorRoute";
import { resetIndexedDb } from "./resetIndexedDb";

beforeEach(resetIndexedDb);

describe("GuideEditorRoute", () => {
  it("redirects to the home page when the guide id is unknown", async () => {
    render(
      <MemoryRouter initialEntries={["/guide/missing"]}>
        <Routes>
          <Route path="/" element={<div>Guides home</div>} />
          <Route path="/guide/:id" element={<GuideEditorRoute />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(screen.getByText("Guides home")).toBeInTheDocument(),
    );
  });
});
