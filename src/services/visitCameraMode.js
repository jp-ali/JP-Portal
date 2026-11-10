export function prefersPhoneCamera(device = globalThis.navigator) {
  if (!device) return false;
  if (device.userAgentData?.mobile === true || device.userAgentData?.platform === "Android") return true;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(`${device.userAgent || ""} ${device.platform || ""}`)) return true;
  // iPad Safari may identify itself as a desktop Mac when requesting desktop sites.
  return device.platform === "MacIntel" && device.maxTouchPoints > 1;
}
