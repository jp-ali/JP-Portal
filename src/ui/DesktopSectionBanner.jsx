import { useEffect, useState } from "react";
import mediaArt from "../assets/header-media.png";
import reportsArt from "../assets/header-reports.png";
import teamArt from "../assets/header-team.png";
import schoolArt from "../assets/header-school.png";
import cardsArt from "../assets/header-cards.png";
import { dashboardItemKeys, useDashboardVisibility } from "../services/dashboardVisibility.js";

const sectionDetails = {
  attendance: ["Attendance", "Daily readings, expenses and attendance records.", "team", "🕘"],
  "attendance-media": ["Attendance Media", "View and manage attendance pictures.", "media", "🖼️"],
  "action-plans": ["Action Plan", "Plan and review daily team activities.", "reports", "🗓️"],
  "action-plan": ["Action Plan", "Keep your daily plan organized.", "reports", "🗓️"],
  "today-visits": ["Today's Visits", "See the school visits recorded today.", "school", "☀️"],
  visits: ["All Visits & Reports", "Explore school visits and report history.", "reports", "📊"],
  "range-visits": ["Visit History", "Review your visits across selected dates.", "reports", "📅"],
  "add-visit": ["Add Visit", "Record a new school visit.", "school", "➕"],
  "sample-details": ["Sample Details", "Track samples shared with schools.", "school", "📦"],
  "add-sample": ["Add Sample", "Record a sample shared with a school.", "school", "📦"],
  "sample-history": ["Sample History", "Review samples you have recorded.", "school", "📋"],
  "expense-report": ["Expense Report", "Review travel, petrol and other expenses.", "reports", "🧾"],
  news: ["News", "Team updates and expense report notices.", "reports", "📰"],
  "news-add": ["Add News", "Choose a date range and notify marketers.", "reports", "📰"],
  "news-old": ["Old News", "Review previously sent news.", "reports", "🗂️"],
  catalogues: ["Catalogues", "Browse and manage the book collection.", "school", "📚"],
  "verification-calls": ["Verification Calls", "Review school visits and follow-up calls.", "reports", "📞"],
  "verification-reports": ["Verification Calls", "Review school visits and follow-up calls.", "reports", "📞"],
  "other-reports": ["Other Reports", "Create and manage custom reports.", "reports", "📋"],
  "custom-report": ["Custom Report", "Edit and review your report data.", "reports", "📋"],
  media: ["Visit Media", "Browse and manage visit pictures.", "media", "🖼️"],
  "marketers-detail": ["Marketer Details", "View the people on your team.", "team", "👥"],
  "add-marketer": ["Add Marketer", "Create or update a marketer account.", "team", "➕"],
  "delete-marketer": ["Delete Marketer", "Manage marketer accounts.", "team", "👥"],
  "old-marketers": ["Old Marketers", "Review previously removed accounts.", "team", "🗄️"],
  "card-designer": ["Card Designer", "Create and customize a business card.", "cards", "🎨"],
  "saved-cards": ["Saved Cards", "Manage your saved card designs.", "cards", "🪪"],
  "my-card": ["My Card", "View and download your business card.", "cards", "▣"],
  hidden: ["Hidden", "Restore hidden dashboard items.", "reports", "👁️"],
  support: ["Support", "Get help and contact the team.", "team", "🎧"],
};

const artByTheme = { media: mediaArt, reports: reportsArt, team: teamArt, school: schoolArt, cards: cardsArt };

export default function DesktopSectionBanner({ view, title, description, theme, role = "marketer", accountId }) {
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 769px)").matches);
  const { hide, isHidden, hideControlsVisible } = useDashboardVisibility(role, accountId);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 769px)");
    const update = () => setIsDesktop(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  if (!isDesktop || view === "home" || (role === "admin" && isHidden(dashboardItemKeys.banner(view)))) return null;
  const [defaultTitle, defaultDescription, defaultTheme, icon] = sectionDetails[view] || ["Portal", "Manage your work in one place.", "reports", "📋"];
  return <header className={`desktop-section-banner desktop-section-banner--${theme || defaultTheme}`}>
    <div className="desktop-section-banner-copy"><span className="desktop-section-banner-icon" aria-hidden="true">{icon}</span><div><h1>{title || defaultTitle}</h1><p>{description || defaultDescription}</p></div></div>
    <img className="desktop-section-banner-art" src={artByTheme[theme || defaultTheme]} alt="" aria-hidden="true" />
    {role === "admin" && hideControlsVisible && <button type="button" className="portal-dashboard-hide desktop-section-banner-hide" title={`Hide ${title || defaultTitle} header`} aria-label={`Hide ${title || defaultTitle} header`} onClick={() => hide({ key: dashboardItemKeys.banner(view), title: `${title || defaultTitle} header`, type: "Banner" })}><svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.5 10.5 0 0 1 12 5c5.2 0 9 4.1 10 7a13 13 0 0 1-3.1 4.7M6.2 6.2C4.2 7.6 2.8 9.8 2 12c1 2.9 4.8 7 10 7 1.7 0 3.2-.4 4.5-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg></button>}
  </header>;
}
