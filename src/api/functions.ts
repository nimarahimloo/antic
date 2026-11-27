import { request } from "./core";

export const functionsApi = {
  async invoke(name: string, payload: Record<string, unknown>) {
    return request(`/functions/${name}`, {
      method: "POST",
      body: payload,
    });
  },
};
