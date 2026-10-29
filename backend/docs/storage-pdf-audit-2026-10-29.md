# Local storage and PDF audit — 29 October 2026

## Scope

Read-only queries against the current local PostgreSQL database. PDFs were generated in memory and parsed with PDF.js; no report or photo data was changed. Counts and sizes describe the local database at the time of the audit, not a future production server.

## Current data

| Collection | Records | Average PostgreSQL payload | Total PostgreSQL payload |
| --- | ---: | ---: | ---: |
| Areas | 7,886 | 171 B | 1.29 MiB |
| Visits | 1,090 | 783 B | 0.81 MiB |
| Saved cards | 4 | 87,554 B | 0.33 MiB |
| Marketers | 3 | 753 B | 2.2 KiB |

The whole local database was 17 MB; `portal_documents` including indexes was 8,480 kB. The 1,090 visits all had a school, date, marketer ID and a current matching marketer. They belonged to one distinct marketer. All 1,090 visit `image` fields were empty. There were no stored PDF documents or custom report collections in this database.

The four saved cards each contain the same 64,241 B (62.7 KiB) JPEG artwork. Its data URL is 85,679 characters. Visit, attendance and offline photo compression code aims for roughly 100 KiB, 65 KiB and 140 KiB respectively; these are targets, not a server-enforced maximum.

## Generated PDF measurements

The visit report used real local visit rows. Expense news and custom report rows were representative synthetic data. All generated files were successfully parsed as PDFs; no PDFs were saved to the database.

| PDF | Rows | Size | Pages |
| --- | ---: | ---: | ---: |
| Visit report | 1 | 5.6 KiB | 1 |
| Visit report | 20 | 37.7 KiB | 2 |
| Visit report | 100 | 179 KiB | 7 |
| Visit report | 500 | 875.4 KiB | 31 |
| Visit report | 1,090 | 1,903.2 KiB | 67 |
| Expense news | 1 | 2.5 KiB | 1 |
| Expense news | 7 | 4.4 KiB | 2 |
| Expense news | 30 | 10.5 KiB | 5 |
| Expense news | 100 | 29.9 KiB | 15 |
| Custom report | 20 | 17.2 KiB | 1 |
| Custom report | 100 | 71.7 KiB | 3 |
| Custom report | 500 | 346.1 KiB | 14 |

PDF size depends on row length, columns, images and page layout. The expense report is compact in bytes but has two tables, so seven rows currently take two pages. The full visit report is text only; visit photos are not included in it.

## Projected photo capacity

At 500 marketers × 20 photos × 100 KiB per day, raw JPEGs would total about 0.95 GiB/day. The isolated database benchmark measured 27.3 MiB of PostgreSQL growth for 200 random 100 KiB photos stored as data URLs. At that rate, 10,000 photos would add about 1.33 GiB/day or about 40 GiB in 30 days, before backups and transaction logs. This is a projection; actual images may compress differently.

## Readiness interpretation

Local functionality and 20/25-user login and visit bursts passed, but this is not an Ubuntu production test. The current database has no real visit-photo history, and photo storage at the projected 500-marketer volume requires disk capacity and backup planning before a full rollout.
