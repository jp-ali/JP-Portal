import React from 'react';
import { companyInitials, companyName, getCompany } from '../services/companyBranding.js';
export default function CompanyBrand() {
  const company = getCompany();
  return <div className="portal-sidebar-brand"><span className="portal-sidebar-logo">{company.logo
    ? <img src={company.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : companyInitials()}</span><strong>{companyName().toUpperCase()}</strong></div>;
}
