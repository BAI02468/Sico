import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { StudioGridSkeleton } from "@/features/studio/components/studio-grid-skeleton";

const ZH_GRID_MESSAGES = {
  "studio.grid.loading": "正在加载数字员工",
};

afterEach(() => {
  i18n.loadAndActivate({ locale: "en", messages: {} });
});

describe("StudioGridSkeleton", () => {
  it("localizes the loading status label", () => {
    act(() => {
      i18n.loadAndActivate({ locale: "zh-CN", messages: ZH_GRID_MESSAGES });
    });
    render(
      <I18nProvider i18n={i18n}>
        <StudioGridSkeleton />
      </I18nProvider>,
    );

    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "正在加载数字员工",
    );
  });
});
