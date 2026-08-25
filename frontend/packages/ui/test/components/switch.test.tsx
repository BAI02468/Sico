import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Switch } from "../../src/components/ui/switch";

describe("Switch", () => {
  it("renders with the switch role by default", (): void => {
    render(<Switch />);
    expect(screen.getByRole("switch")).toBeVisible();
  });

  describe("sizes", () => {
    it("size=default → h-switch-default-height and w-8", (): void => {
      render(<Switch />);
      expect(screen.getByRole("switch")).toHaveClass(
        "data-[size=default]:h-switch-default-height",
        "data-[size=default]:w-8",
      );
    });

    it("size=sm → h-3.5 and w-6", (): void => {
      render(<Switch size="sm" />);
      expect(screen.getByRole("switch")).toHaveClass(
        "data-[size=sm]:h-3.5",
        "data-[size=sm]:w-6",
      );
    });
  });

  describe("thumb sizes", () => {
    it("size=default → size-4", (): void => {
      render(<Switch />);
      expect(screen.getByTestId("switch-thumb")).toHaveClass(
        "group-data-[size=default]/switch:size-4",
      );
    });

    it("size=sm → size-3", (): void => {
      render(<Switch size="sm" />);
      expect(screen.getByTestId("switch-thumb")).toHaveClass(
        "group-data-[size=sm]/switch:size-3",
      );
    });
  });

  describe("thumb translations", () => {
    it("size=default checked → translate-x-3.5", (): void => {
      render(<Switch defaultChecked />);
      expect(screen.getByTestId("switch-thumb")).toHaveClass(
        "group-data-[size=default]/switch:data-checked:translate-x-3.5",
      );
    });

    it("size=default unchecked → translate-x-0", (): void => {
      render(<Switch />);
      expect(screen.getByTestId("switch-thumb")).toHaveClass(
        "group-data-[size=default]/switch:data-unchecked:translate-x-0",
      );
    });

    it("size=sm checked → translate-x-2.5", (): void => {
      render(<Switch size="sm" defaultChecked />);
      expect(screen.getByTestId("switch-thumb")).toHaveClass(
        "group-data-[size=sm]/switch:data-checked:translate-x-2.5",
      );
    });

    it("size=sm unchecked → translate-x-0", (): void => {
      render(<Switch size="sm" />);
      expect(screen.getByTestId("switch-thumb")).toHaveClass(
        "group-data-[size=sm]/switch:data-unchecked:translate-x-0",
      );
    });
  });

  describe("state classes", () => {
    it("checked → component track fill token", (): void => {
      render(<Switch defaultChecked />);
      expect(screen.getByRole("switch")).toHaveClass(
        "data-checked:bg-switch-track-fill-selected",
      );
    });

    it("unchecked → component track fill token", (): void => {
      render(<Switch />);
      expect(screen.getByRole("switch")).toHaveClass(
        "data-unchecked:bg-switch-track-fill-rest",
      );
    });

    it("thumb → component fill token", (): void => {
      render(<Switch />);
      expect(screen.getByTestId("switch-thumb")).toHaveClass(
        "bg-switch-thumb-fill",
      );
    });

    it("carries the semantic focus-visible ring utilities", (): void => {
      render(<Switch />);
      expect(screen.getByRole("switch")).toHaveClass(
        "focus-visible:border-focus-rest",
        "focus-visible:ring-3",
        "focus-visible:ring-focus-rest/50",
      );
    });

    it("aria-invalid → input error border and focus ring utilities", (): void => {
      render(<Switch aria-invalid />);
      expect(screen.getByRole("switch")).toHaveClass(
        "aria-invalid:border-input-stroke-error",
        "aria-invalid:ring-3",
        "aria-invalid:ring-focus-error/20",
      );
    });

    it("disabled → disabled cursor and opacity utilities", (): void => {
      render(<Switch disabled />);
      expect(screen.getByRole("switch")).toHaveClass(
        "data-disabled:cursor-not-allowed",
        "data-disabled:opacity-50",
      );
    });
  });
});
