import { request } from "./core";

export const appApi = {
  async getPublicSettings() {
    return request("/app/public-settings", { auth: false });
  },
};
