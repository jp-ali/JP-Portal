export const offlineModeFor = (user) => user?.role === "trainer" ? (user.offlineMode === "none" ? "none" : "trainer") : ["marketer", "trainer", "both"].includes(user?.offlineMode) ? user.offlineMode : "marketer";

export const canUseOfflineMode = (user, mode) => {
  const assigned = offlineModeFor(user);
  return assigned === "both" || assigned === mode;
};
