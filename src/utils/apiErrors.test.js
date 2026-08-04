import { describe, expect, it } from "vitest";
import { getValidationErrors } from "./apiErrors";

describe("getValidationErrors", () => {
  it("reads validation errors from the API data envelope", () => {
    const error = {
      response: {
        data: {
          message: "Du lieu khong hop le",
          data: {
            email: ["Email da ton tai."],
          },
        },
      },
    };

    expect(getValidationErrors(error)).toEqual({
      email: "Email da ton tai.",
    });
  });
});
