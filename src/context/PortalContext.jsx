import { createContext, useContext } from "react";

export const PortalContext = createContext(null);

export function usePortalContext() {
  const context = useContext(PortalContext);
  if (!context) throw new Error("Portal panel must be rendered inside its portal");
  return context;
}
