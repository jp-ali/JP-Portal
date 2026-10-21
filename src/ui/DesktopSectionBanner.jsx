import { useEffect, useState } from "react";
import mediaArt from "../assets/header-media.png";
import reportsArt from "../assets/header-reports.png";
import teamArt from "../assets/header-team.png";
import schoolArt from "../assets/header-school.png";
import cardsArt from "../assets/header-cards.png";

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
  hidden: ["Hidden", "Restore hidden dashboard items.", "reports", "👁️"],
  support: ["Support", "Get help and contact the team.", "team", "🎧"],
};

const artByTheme = { media: mediaArt, reports: reportsArt, team: teamArt, school: schoolArt, cards: cardsArt };

export default function DesktopSectionBanner({ view, title, description, theme }) {
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 769px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 769px)");
    const update = () => setIsDesktop(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  if (!isDesktop || view === "home") return null;
  const [defaultTitle, defaultDescription, defaultTheme, icon] = sectionDetails[view] || ["Portal", "Manage your work in one place.", "reports", "📋"];
  return <header className={`desktop-section-banner desktop-section-banner--${theme || defaultTheme}`}>
    <div className="desktop-section-banner-copy"><span className="desktop-section-banner-icon" aria-hidden="true">{icon}</span><div><h1>{title || defaultTitle}</h1><p>{description || defaultDescription}</p></div></div>
    <img className="desktop-section-banner-art" src={artByTheme[theme || defaultTheme]} alt="" aria-hidden="true" />
  </header>;
}
