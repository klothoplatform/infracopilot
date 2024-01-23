import ArchitectureEditor from "./ArchitectureEditor";
import { render, screen } from "@testing-library/react";
import React from "react";
import { BrowserRouter } from "react-router-dom";

describe("ArchitectureEditor", () => {
  test("should render the infracopilot logo text", async () => {
    renderEditor();
    expect(await screen.findByText("InfraCopilot")).toBeInTheDocument();
  });
});

const renderEditor = () => {
  return render(
    <BrowserRouter>
      <ArchitectureEditor />
    </BrowserRouter>,
  );
};
