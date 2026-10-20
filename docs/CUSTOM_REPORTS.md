# Admin custom reports

## Run the updated app

1. In the project root, run `npm install` and then `npm run dev`.
2. In a second terminal, run `cd backend`, `npm install`, and `npm run dev`.
3. Keep the existing `backend/.env` values for `SESSION_SECRET`, admin credentials, and Firebase server credentials. No new environment variables or Firestore indexes are required.
4. Sign in as an admin. The dashboard now has **Other Reports**. Choose **Add Report**, enter a name, and create it. Its date defaults to today and can be edited.
5. Choose **Add Row** for manual entry or **Quick Add** to paste labeled contact details. Edit any cell directly; changes save when the field loses focus. Use Search, City, and Remarks filters, then Expand, Excel, or PDF as needed.
6. Open **Verification Calls** from the dashboard or sidebar. **School Visits** is first and opens the existing verification table. Every custom report created in Other Reports also appears here.

## Session behavior

This app uses an HMAC-signed, HTTP-only cookie, not JWT. Admin tokens have no server expiry. The admin cookie is refreshed on authenticated API requests to keep the browser session active; manual Logout clears it. Marketer sessions retain their existing eight-hour policy. Browsers can cap cookie lifetime and can clear cookies via browser settings.

## Validation

Run `npm run build` in the project root, `node --test src/domain/parseQuickContact.test.js`, and `npm test` in `backend`.
