import { request } from "./authApi";

export const listMarketers = async () => (await request("/marketers")).marketers;
export const listDeletedMarketers = async () => (await request("/marketers/deleted")).marketers;
export const listAccessibleMarketers = async () => (await request("/marketers/accessible")).marketers;
export const createMarketer = (data) => request("/marketers", { method: "POST", body: JSON.stringify(data) });
export const updateMarketer = (id, data) => request(`/marketers/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) });
export const archiveMarketer = (id) => request(`/marketers/${encodeURIComponent(id)}`, { method: "DELETE" });
export const restoreMarketer = (id) => request(`/marketers/deleted/${encodeURIComponent(id)}/restore`, { method: "POST" });
export const removeDeletedMarketer = (id) => request(`/marketers/deleted/${encodeURIComponent(id)}`, { method: "DELETE" });
export const saveOwnProfilePhoto = (photo) => request("/marketers/me/photo", { method: "PUT", body: JSON.stringify({ photo }) });
export const deleteOwnProfilePhoto = () => request("/marketers/me/photo", { method: "DELETE" });
export const saveMarketerProfilePhoto = (id, photo) => request(`/marketers/${encodeURIComponent(id)}/photo`, { method: "PUT", body: JSON.stringify({ photo }) });
export const deleteMarketerProfilePhoto = (id) => request(`/marketers/${encodeURIComponent(id)}/photo`, { method: "DELETE" });
