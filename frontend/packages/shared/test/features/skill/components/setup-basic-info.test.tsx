import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { SetupBasicInfo } from "@/features/skill/components/setup/setup-basic-info";
import type { SetupBasicInfoValues } from "@/features/skill/components/setup/setup-basic-info-values";

const roles = [
  { name: "Tester", value: "tester" },
  { name: "Developer", value: "developer" },
];

function BasicInfoFixture({
  creatorUsername,
}: {
  creatorUsername?: string;
}): ReactElement {
  const form = useForm<SetupBasicInfoValues>({
    defaultValues: { name: "Visual Bot", role: "tester" },
  });
  return (
    <SetupBasicInfo
      control={form.control}
      roleOptions={roles}
      creatorUsername={creatorUsername}
      disabled={false}
    />
  );
}

describe("SetupBasicInfo", () => {
  it("renders fields without a nested save action", () => {
    render(<BasicInfoFixture />);

    expect(screen.getByRole("textbox", { name: /role name/i })).toHaveValue(
      "Visual Bot",
    );
    expect(
      screen.getByRole("combobox", { name: "Industry Type" }),
    ).toHaveTextContent("Tester");
    expect(
      screen.queryByText("Adding new role is not supported."),
    ).not.toBeInTheDocument();
    expect(
      screen
        .getByRole("textbox", { name: /role name/i })
        .closest(".rounded-xl"),
    ).toBeNull();
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  });

  it("marks the basic information fields as required", () => {
    render(<BasicInfoFixture />);

    expect(screen.getByRole("textbox", { name: /role name/i })).toBeRequired();
    expect(
      screen.getByRole("combobox", { name: "Industry Type" }),
    ).toHaveAttribute("aria-required", "true");
  });

  it("renders creator wording without an avatar", () => {
    render(<BasicInfoFixture creatorUsername="owner@example.com" />);

    expect(screen.getByText("Created by owner@example.com")).toBeVisible();
    expect(screen.queryByTestId("avatar-root")).not.toBeInTheDocument();
  });
});
