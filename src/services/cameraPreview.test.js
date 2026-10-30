import test from "node:test";
import assert from "node:assert/strict";
import { attachCameraPreview } from "./cameraPreview.js";

test("camera stream attaches when the video element mounts after permission resolves", async () => {
  const stream = { getVideoTracks: () => [{ readyState: "live" }] };
  const video = { isConnected: true, readyState: 0, videoWidth: 0, videoHeight: 0,
    srcObject: null, play: async () => { video.readyState = 2; video.videoWidth = 640; video.videoHeight = 480; } };
  const ref = { current: null };
  setTimeout(() => { ref.current = video; }, 30);
  assert.equal(await attachCameraPreview(ref, stream), video);
  assert.equal(video.srcObject, stream);
  assert.equal(video.muted, true);
  assert.equal(video.playsInline, true);
});
