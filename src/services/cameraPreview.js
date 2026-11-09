const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export class CameraPlaybackRequiredError extends Error {
  constructor() {
    super("Camera preview is paused. Tap Start preview to continue.");
    this.name = "CameraPlaybackRequiredError";
  }
}

export function cameraStartMessage(error) {
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") return "Camera access is blocked. Allow Camera for this site in browser settings, then retry.";
  if (error?.name === "NotReadableError") return "The camera is busy. Close other camera apps or calls, then retry.";
  return error?.message || "Camera preview did not start. Retry preview or use your phone camera below.";
}

export function hasCameraFrame(video, stream) {
  return Boolean(video?.readyState >= 2 && video.paused !== true && video.videoWidth > 0 && video.videoHeight > 0
    && stream?.getVideoTracks().some((track) => track.readyState === "live" && track.enabled !== false && !track.muted));
}

async function waitForVideo(ref, stream, milliseconds) {
  const until = Date.now() + milliseconds;
  while (Date.now() < until) {
    if (stream.getVideoTracks().every((track) => track.readyState === "ended")) throw new Error("Camera was stopped.");
    if (ref.current?.isConnected !== false && ref.current) return ref.current;
    await pause(40);
  }
  throw new Error("Camera preview could not open. Close and try again.");
}

async function waitForFrame(video, stream, milliseconds) {
  const until = Date.now() + milliseconds;
  while (Date.now() < until) {
    if (stream.getVideoTracks().every((track) => track.readyState === "ended")) throw new Error("Camera was stopped.");
    if (hasCameraFrame(video, stream)) return;
    await pause(60);
  }
  throw new Error("Camera opened but no video appeared. Check Safari camera access, then reopen the camera.");
}

async function playPreview(video) {
  try {
    await Promise.race([Promise.resolve(video.play()), pause(3000)]);
  } catch (error) {
    if (error?.name === "NotAllowedError") {
      video.controls = true;
      throw new CameraPlaybackRequiredError();
    }
    throw error;
  }
}

export async function attachCameraPreview(ref, stream) {
  // Keep play() in the tap's call stack when resuming an existing iOS stream.
  const video = ref.current?.isConnected !== false && ref.current
    ? ref.current : await waitForVideo(ref, stream, 2500);
  video.muted = true;
  video.defaultMuted = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute?.("muted", "");
  video.setAttribute?.("playsinline", "");
  video.setAttribute?.("webkit-playsinline", "");
  // WebKit can suspend a MediaStream video outside the visible viewport.
  video.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  if (video.srcObject !== stream) video.srcObject = stream;
  await playPreview(video);
  try {
    await waitForFrame(video, stream, 5000);
  } catch (error) {
    if (video.srcObject !== stream) throw error;
    if (video.paused) {
      video.controls = true;
      throw new CameraPlaybackRequiredError();
    }
    video.srcObject = null;
    await pause(100);
    video.srcObject = stream;
    await playPreview(video);
    await waitForFrame(video, stream, 3000);
  }
  video.controls = false;
  return video;
}
