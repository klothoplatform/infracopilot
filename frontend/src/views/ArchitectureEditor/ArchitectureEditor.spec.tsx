import React from "react";
import { render, screen } from "@testing-library/react";
import ArchitectureEditor from "./ArchitectureEditor";

test("renders learn react link", () => {
  render(<ArchitectureEditor />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
