import { accessibleMarketers, archiveMarketer, createMarketer, deleteArchivedMarketer, listMarketers, restoreMarketer, updateMarketer } from "../services/marketerService.js";

function handle(error, next) {
  if (/^(Invalid |Name, email|Password must|No changes)/.test(error.message)) {
    error.status = 400;
  }
  next(error);
}

export async function list(request, response, next) {
  try { response.json({ marketers: await listMarketers(request.path === "/deleted") }); } catch (error) { next(error); }
}
export async function accessible(request, response, next) {
  try { response.json({ marketers: await accessibleMarketers(request.user) }); } catch (error) { next(error); }
}
export async function create(request, response, next) {
  try { response.status(201).json({ marketer: await createMarketer(request.body) }); } catch (error) { handle(error, next); }
}
export async function update(request, response, next) {
  try {
    const marketer = await updateMarketer(request.params.id, request.body);
    if (!marketer) return response.status(404).json({ error: "Marketer not found" });
    response.json({ marketer });
  } catch (error) { handle(error, next); }
}
export async function archive(request, response, next) {
  try { response.status((await archiveMarketer(request.params.id)) ? 204 : 404).end(); } catch (error) { next(error); }
}
export async function restore(request, response, next) {
  try {
    const marketer = await restoreMarketer(request.params.id);
    if (!marketer) return response.status(404).json({ error: "Archived marketer not found" });
    response.json({ marketer });
  } catch (error) { next(error); }
}
export async function removeArchived(request, response, next) {
  try { response.status((await deleteArchivedMarketer(request.params.id)) ? 204 : 404).end(); } catch (error) { next(error); }
}
