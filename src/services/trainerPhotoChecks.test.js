import test from "node:test";
import assert from "node:assert/strict";
import { checkTrainerCompressedPhoto, checkTrainerPhotoFile, photoDataUrlBytes } from "./trainerPhotoChecks.js";

test("trainer photo checks accept phone formats and reject oversized source files", () => {
  assert.doesNotThrow(() => checkTrainerPhotoFile({ name: "camera.HEIC", type: "", size: 2048 }));
  assert.throws(() => checkTrainerPhotoFile({ name: "document.pdf", type: "application/pdf", size: 2048 }), /JPEG, PNG, WebP or HEIC/);
  assert.throws(() => checkTrainerPhotoFile({ name: "camera.jpg", type: "image/jpeg", size: 13 * 1024 * 1024 }), /12 MB/);
});

test("trainer compressed photo checks count actual decoded KB", () => {
  const small = `data:image/jpeg;base64,${Buffer.alloc(100 * 1024).toString("base64")}`;
  const large = `data:image/jpeg;base64,${Buffer.alloc(100 * 1024 + 1).toString("base64")}`;
  assert.equal(photoDataUrlBytes(small), 100 * 1024);
  assert.equal(checkTrainerCompressedPhoto(small, 100, "Visit"), small);
  assert.throws(() => checkTrainerCompressedPhoto(large, 100, "Visit"), /100 KB/);
});
