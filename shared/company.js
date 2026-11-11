export const DEFAULT_COMPANY_ID = 'javed';
export const FEATURE_LABELS = {
  marketer: 'Marketer portal', trainer: 'Trainer portal', attendance: 'Attendance',
  monthlyAttendance: 'Monthly attendance', visits: 'School visits', offlineVisits: 'Offline visits',
  dailyPlans: 'Daily action plans', weeklyPlans: 'Weekly action plans', expenses: 'Expenses',
  exports: 'PDF / Excel downloads', cards: 'My card', news: 'News', catalogues: 'Catalogues'
};
export const DEFAULT_FEATURES = Object.fromEntries(Object.keys(FEATURE_LABELS).map(key => [key, true]));
export const DEFAULT_COMPANY = {
  id: DEFAULT_COMPANY_ID, slug: DEFAULT_COMPANY_ID, name: 'Javed Publishers', active: true,
  primaryColor: '#800e2d', logo: '', banner: '', supportEmail: 'info@javedpublishers.com',
  supportPhone: '+92-3068482000', website: 'javedpublishers.com', books: ['maxford', 'vintage', 'canon', 'Marshall', 'stemford'],
  features: DEFAULT_FEATURES, domains: [], adminEmail: '', adminName: 'Administrator'
};
export function collectionFeature(path) {
  const root = String(path).split('/')[0].toLowerCase();
  if (root.startsWith('trainer_') || root === 'trainers') {
    if (root.includes('attendance')) return 'attendance';
    if (root.includes('daily')) return 'dailyPlans';
    if (root.includes('weekly')) return 'weeklyPlans';
    if (root.includes('expense')) return 'expenses';
    if (root.includes('visit')) return 'visits';
    return 'trainer';
  }
  if (/attendance|gazetted_holidays/.test(root)) return 'attendance';
  if (/weekly/i.test(root)) return 'weeklyPlans';
  if (/daily|action.?plan/i.test(root)) return 'dailyPlans';
  if (/expense|petrol_rates/.test(root)) return 'expenses';
  if (/visit/i.test(root)) return 'visits';
  if (/card/.test(root)) return 'cards';
  if (/news|push_?subscriptions/.test(root)) return 'news';
  if (/catalogue/.test(root)) return 'catalogues';
  return null;
}
