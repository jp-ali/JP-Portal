const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function hasCameraFrame(video, stream) {
  return Boolean(video?.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0
    && stream?.getVideoTracks().some((track) => track.readyState === "live" && !track.muted));
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

export async function attachCameraPreview(ref, stream) {
  const video = await waitForVideo(ref, stream, 2500);
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  const playing = Promise.resolve().then(() => video.play());
  await Promise.race([playing.catch(() => {}), pause(3000)]);
  try {
    await waitForFrame(video, stream, 5000);
  } catch (error) {
    if (video.srcObject !== stream) throw error;
    video.srcObject = null;
    await pause(100);
    video.srcObject = stream;
    Promise.resolve().then(() => video.play()).catch(() => {});
    await waitForFrame(video, stream, 3000);
  }
  return video;
}
