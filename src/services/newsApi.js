import { request } from "./authApi.js";

export const listNews = () => request("/news");
export const publishNews = (news) => request("/news", { method: "POST", body: JSON.stringify(news) });

