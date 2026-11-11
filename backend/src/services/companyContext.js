import { AsyncLocalStorage } from 'node:async_hooks';
import { DEFAULT_COMPANY, DEFAULT_COMPANY_ID, collectionFeature } from '../../../shared/company.js';
export const companyContext = new AsyncLocalStorage();
export const currentCompany = () => companyContext.getStore()?.company || DEFAULT_COMPANY;
export const currentCompanyId = () => currentCompany().id || DEFAULT_COMPANY_ID;
export const withCompany = (company, callback) => companyContext.run({ company }, callback);
export function assertCollectionFeature(path) {
  if (companyContext.getStore()?.system) return;
  const company = currentCompany();
  const root = String(path).split('/')[0];
  const feature = collectionFeature(path);
  if ((root.startsWith('trainer_') || root === 'trainers') && company.features?.trainer === false
    || feature && company.features?.[feature] === false) {
    throw Object.assign(new Error('This feature is disabled for your company'), { status: 403 });
  }
}
