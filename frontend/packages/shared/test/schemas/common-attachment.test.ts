import { describe, expect, it } from "vitest";

import { commonAttachmentSchema } from "@/schemas/common-attachment";

describe("commonAttachmentSchema", () => {
  it("parses a complete attachment with an optional sasUrl", () => {
    expect(
      commonAttachmentSchema.safeParse({
        name: "report.pdf",
        size: 10,
        type: "pdf",
        uri: "asset://1",
        sasUrl: "https://blob.example/report.pdf?sig=abc",
      }).success,
    ).toBe(true);
  });

  it("parses an attachment without a sasUrl", () => {
    expect(
      commonAttachmentSchema.safeParse({
        name: "report.pdf",
        size: 10,
        type: "pdf",
        uri: "asset://1",
      }).success,
    ).toBe(true);
  });

  it("rejects an attachment missing a required field", () => {
    expect(
      commonAttachmentSchema.safeParse({
        name: "report.pdf",
        size: 10,
        type: "pdf",
      }).success,
    ).toBe(false);
  });
});
