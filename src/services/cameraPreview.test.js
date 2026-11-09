import test from "node:test";
import assert from "node:assert/strict";
import { attachCameraPreview, CameraPlaybackRequiredError, hasCameraFrame } from "./cameraPreview.js";

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

test("Safari playback denial keeps the stream available for a direct tap to resume", async () => {
  const stream = { getVideoTracks: () => [{ readyState: "live", muted: false }] };
  const video = { isConnected: true, paused: true, readyState: 0, videoWidth: 0, videoHeight: 0,
    srcObject: null, play: () => Promise.reject(Object.assign(new Error("gesture required"), { name: "NotAllowedError" })) };
  const ref = { current: video };
  await assert.rejects(attachCameraPreview(ref, stream), CameraPlaybackRequiredError);
  assert.equal(video.srcObject, stream);
  assert.equal(video.controls, true);

  let playCalled = false;
  video.play = () => {
    playCalled = true;
    assert.equal(video.srcObject, stream);
    video.paused = false; video.readyState = 2; video.videoWidth = 640; video.videoHeight = 480;
    return Promise.resolve();
  };
  const resume = attachCameraPreview(ref, stream);
  assert.equal(playCalled, true, "resume must call play before yielding the user gesture");
  assert.equal(await resume, video);
  assert.equal(video.controls, false);
  assert.equal(hasCameraFrame(video, stream), true);
});

test("mobile preview is visible and inline before a stream is assigned", async () => {
  const stream = { getVideoTracks: () => [{ readyState: "live" }] };
  const attributes = new Set();
  let source; let visible = false;
  const video = { isConnected: true, readyState: 2, videoWidth: 640, videoHeight: 480,
    setAttribute: (name) => attributes.add(name), scrollIntoView: () => { visible = true; },
    get srcObject() { return source; },
    set srcObject(value) {
      assert.equal(visible, true);
      assert.equal(attributes.has("playsinline"), true);
      assert.equal(attributes.has("muted"), true);
      assert.equal(video.defaultMuted, true);
      source = value;
    }, play: async () => {} };
  await attachCameraPreview({ current: video }, stream);
});

test("a paused or disabled camera cannot be captured as a valid frame", () => {
  const video = { readyState: 2, paused: true, videoWidth: 640, videoHeight: 480 };
  const track = { readyState: "live", enabled: true };
  const stream = { getVideoTracks: () => [track] };
  assert.equal(hasCameraFrame(video, stream), false);
  video.paused = false;
  track.enabled = false;
  assert.equal(hasCameraFrame(video, stream), false);
});
