import { readSessionCookie, verifyJwtSession } from "../services/jwtSession.js";
import { profileFromClaims } from "../services/authService.js";

export async function requireAuth(request, response, next) {
  try {
    const token = readSessionCookie(request);
    const claims = await verifyJwtSession(token);
    if (!claims) return response.status(401).json({ error: "Authentication required" });
    if (claims.role === 'owner' || claims.companyId !== request.company?.id || claims.authVersion !== request.companyAuthVersion) return response.status(401).json({ error: 'Sign in to this company portal again' });
    const profile = await profileFromClaims(claims);
    if (!profile) return response.status(401).json({ error: "Account is no longer active" });
    if (profile.role === 'trainer' && request.company.features.trainer === false || profile.role === 'marketer' && request.company.features.marketer === false) return response.status(403).json({ error: 'This portal is disabled for your company' });
    request.user = { ...profile, companyId: request.company.id };
    const path = request.originalUrl.split('?')[0];
    const features = request.company.features;
    const gated = [
      [/\/trainers(?:\/|$)/, 'trainer'], [/\/marketers(?:\/|$)/, 'marketer'],
      [/\/monthly(?:-all)?$/, 'monthlyAttendance'], [/\/attendance(?:\/|$)/, 'attendance'],
      [/\/offline-visits(?:\/|$)/, 'offlineVisits'], [/\/expenses?(?:\/|$)/, 'expenses'],
      [/\/weekly(?:\/|$)/, 'weeklyPlans'], [/\/daily(?:\/|$)/, 'dailyPlans'],
      [/\/visits(?:\/|$)/, 'visits'], [/\/cards?(?:\/|-|$)/, 'cards'], [/\/news(?:\/|$)/, 'news'],
      [/\/(?:pdf|excel|export|download)(?:\/|-|$)/, 'exports']
    ];
    if (gated.some(([pattern, feature]) => pattern.test(path) && features[feature] === false)) return response.status(403).json({ error: 'This feature is disabled for your company' });
    if (request.body?.data?.offlineVisit === true && features.offlineVisits === false) return response.status(403).json({ error: 'Offline visits are disabled for your company' });
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(request, response, next) {
  if (request.user?.role !== "admin") return response.status(403).json({ error: "Admin access required" });
  next();
}
