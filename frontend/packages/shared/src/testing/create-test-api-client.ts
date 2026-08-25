import axios, { type AxiosInstance } from "axios";

export function createTestApiClient(
  overrides: Partial<
    Pick<AxiosInstance, "get" | "post" | "put" | "delete">
  > = {},
): AxiosInstance {
  return Object.assign(axios.create(), overrides);
}
