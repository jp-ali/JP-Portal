import React from "react";
import { containerStyle, globalStyle, renderRedSkeleton, renderResponsiveStyles } from "./portalPresentation.jsx";

export default function PortalLoading() {
  return (
    <div style={globalStyle} role="status" aria-label="Loading portal">
      <div style={{ ...containerStyle, minHeight: 450 }}>
        {renderResponsiveStyles()}
        <div style={{ height: 80, borderRadius: 16, background: "linear-gradient(135deg, #650b20, #86172f 55%, #1e293b)", marginBottom: 16 }} />
        {renderRedSkeleton()}
      </div>
    </div>
  );
}
