import test from "node:test";
import assert from "node:assert/strict";
import { attachCameraPreview, hasCameraFrame } from "./cameraPreview.js";

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

test("capture refuses an ended or muted mobile camera stream", () => {
  const video = { readyState: 2, videoWidth: 640, videoHeight: 480 };
  const track = { readyState: "live", muted: false };
  const stream = { getVideoTracks: () => [track] };
  assert.equal(hasCameraFrame(video, stream), true);
  track.muted = true;
  assert.equal(hasCameraFrame(video, stream), false);
  track.muted = false;
  track.readyState = "ended";
  assert.equal(hasCameraFrame(video, stream), false);
  track.readyState = "live";
  video.videoWidth = 0;
  assert.equal(hasCameraFrame(video, stream), false);
});
