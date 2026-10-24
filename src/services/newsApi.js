import { request } from "./authApi.js";

export const listNews = () => request("/news");
export const markNewsRead = (ids) => request("/news/read", { method: "POST", body: JSON.stringify({ ids }) });
export const publishNews = (news) => request("/news", { method: "POST", body: JSON.stringify(news), timeoutMs: 180000 });
export const listNewsSchedules = () => request("/news/schedules");
export const createNewsSchedule = (schedule) => request("/news/schedules", { method: "POST", body: JSON.stringify(schedule) });
export const cancelNewsSchedule = (id) => request(`/news/schedules/${encodeURIComponent(id)}`, { method: "DELETE" });
export const deleteNews = (id) => request(`/news/${encodeURIComponent(id)}/delete`, { method: "PATCH" });
export const restoreNews = (id) => request(`/news/${encodeURIComponent(id)}/restore`, { method: "PATCH" });
export const newsReportUrl = (id, download = false) => `${import.meta.env.VITE_API_BASE_URL || "/api"}/news/${encodeURIComponent(id)}/report${download ? "?download=1" : ""}`;

