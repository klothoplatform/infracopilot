import React from "react";
import { render, screen } from "@testing-library/react";
import WebUI from "./WebUI";

test("renders learn react link", () => {
  render(<WebUI />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
