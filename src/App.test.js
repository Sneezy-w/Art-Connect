import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders loading spinner", () => {
  render(<App />);
  const loadingElement = screen.getByTestId("loading-spinner");
  expect(loadingElement).toBeInTheDocument();
});
