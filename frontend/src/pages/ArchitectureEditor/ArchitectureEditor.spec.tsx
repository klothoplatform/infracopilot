import ArchitectureEditor from "./ArchitectureEditor";
import { render, screen } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";

describe("ArchitectureEditor", () => {
  test("should render with login button", async () => {
    renderEditor();
    expect(screen.getByRole("button", { name: /Log In/i })).toBeInTheDocument();
  });
});

const renderEditor = () => {
  return render(
    <BrowserRouter>
      <ArchitectureEditor />
    </BrowserRouter>,
  );
};
