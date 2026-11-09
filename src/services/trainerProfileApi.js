import { request } from "./authApi.js";

export const saveTrainerProfilePhoto = (photo) => request("/trainers/me/photo", { method: "PUT", body: JSON.stringify({ photo }) });
export const deleteTrainerProfilePhoto = () => request("/trainers/me/photo", { method: "DELETE" });
