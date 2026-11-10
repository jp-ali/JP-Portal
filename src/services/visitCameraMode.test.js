import test from "node:test";
import assert from "node:assert/strict";
import { prefersPhoneCamera } from "./visitCameraMode.js";

test("iPhone, Android and iPad desktop mode default to the phone camera", () => {
  for (const device of [
    { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1" },
    { userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel) Chrome/130.0 Mobile Safari/537.36" },
    { userAgent: "Mozilla/5.0 (Linux; Android 14; Tablet) AppleWebKit/537.36" },
    { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari/605.1.15", platform: "MacIntel", maxTouchPoints: 5 },
    { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)", platform: "iPhone", maxTouchPoints: 5 },
    { userAgentData: { mobile: false, platform: "Android" } },
    { userAgentData: { mobile: true } }
  ]) assert.equal(prefersPhoneCamera(device), true);
});

test("laptops and desktop browsers keep the live webcam preview", () => {
  for (const device of [
    { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0", platform: "Win32", maxTouchPoints: 10 },
    { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari/605.1.15", platform: "MacIntel", maxTouchPoints: 0 },
    { userAgent: "Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0", userAgentData: { mobile: false } },
    undefined
  ]) assert.equal(prefersPhoneCamera(device), false);
});
