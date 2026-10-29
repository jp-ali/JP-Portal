# Local portal benchmark — 29 October 2026 (Pakistan time)

## Method

Ran the Express API and load generator on the same Windows computer against PostgreSQL 17.11. The machine reported 8 logical CPUs and 15.8 GiB RAM. The script created a separate temporary PostgreSQL schema, migrated it, loaded 500 marketer accounts, 10,000 visits and 200 random 100 KiB photos, then deleted the schema. The live `public` schema was not used for the test.

Measurements below are representative of the final corrected run. `p95` means 95% of requests finished at or below that time. The local load generator and API shared a Node process, so these are relative local measurements, not phone-network timings.

| Operation | Requests | Concurrent clients | p50 | p95 | Failures |
| --- | ---: | ---: | ---: | ---: | ---: |
| Health | 300 | 20 | 31 ms | 73 ms | 0 |
| Marketer own visits (20 records) | 200 | 10 | 144 ms | 267 ms | 0 |
| Marketer visit summary | 150 | 10 | 120 ms | 150 ms | 0 |
| Admin all visits (10,000 records) | 25 | 3 | 2,079 ms | 2,335 ms | 0 |
| Marketer record write | 100 | 10 | 46 ms | 68 ms | 0 |
| 100 KiB photo read | 100 | 10 | 62 ms | 79 ms | 0 |
| 100 KiB photo write | 20 | 5 | 41 ms | 59 ms | 0 |
| Marketer login, one at a time | 6 | 1 | 632 ms | 685 ms | 0 |
| Marketer login, simultaneous | 20 | 4 | 2,441 ms | 2,681 ms | 0 |
| Marketer card | 30 | 5 | 34 ms | 168 ms | 0 |

The corrected two-minute mixed run completed 2,172 requests with 10 concurrent clients, 0 errors, 18 requests/second, 571 ms p50 and 814 ms p95. Process RSS rose from 103 to 175 MiB; after explicit garbage collection, JS heap usage changed from 22 to 23 MiB. The run did not show growing retained JS heap, though this duration cannot rule out a longer-term leak.

## 20 and 25 user burst test

A separate run logged in distinct marketer accounts simultaneously, then saved one visit per account simultaneously, first without a photo and then with a 100 KiB photo. The same 500-marketer/10,000-visit fixture was used. Every request succeeded. The table gives the second run; a prior run measured login p95 of 12.33 s for 20 users and 17.17 s for 25 users, showing run-to-run variation.

| Simultaneous marketers | Login p95 | Visit-save p95 | Visit with 100 KiB photo p95 | Failures |
| ---: | ---: | ---: | ---: | ---: |
| 20 | 11.83 s | 90 ms | 176 ms | 0 |
| 25 | 14.85 s | 113 ms | 194 ms | 0 |

Login CPU cost grows sharply when many people sign in at exactly the same moment. Visit saves remained fast at these burst sizes. This is a same-machine local test, so server hardware and network conditions will change the absolute timings.

## Login optimization retest

Password verification now runs in a bounded pool of up to four Node worker threads. It still verifies the existing bcrypt hashes; hash format and password policy were not changed. The same isolated 500-marketer/10,000-visit fixture was benchmarked again after the change.

| Simultaneous marketers | Login p95 before | Login p95 after | Improvement | Visit with 100 KiB photo p95 after | Failures after |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 20 | 11.83 s | 4.36 s | 63% less time | 238 ms | 0 |
| 25 | 14.85 s | 5.35 s | 64% less time | 231 ms | 0 |

The four-login concurrency test improved from 2.65 s p95 to 1.02 s p95. Single-login latency remained around 0.6–0.8 s because the bcrypt work itself is unchanged. Visit-save timings vary by run and are still under 0.3 s locally in this retest. The post-change backend suite passed 49/49 tests. The final process RSS was 186 MiB in the worker-thread run versus 115 MiB in the prior run, so the faster logins use more process memory. On a server with fewer available CPU cores, the login gain may be smaller.

## Bottlenecks and capacity

- The admin all-visits response was 28.8 MiB. PostgreSQL executed the underlying unfiltered query in about 7 ms; transferring and serializing 10,000 rows, including image data, dominated the roughly 2.1-second local response. On a phone connection this can take longer.
- The filtered marketer query executed in about 32 ms inside PostgreSQL. Its HTTP p95 was 267 ms at 10 concurrent clients. It used a bitmap heap scan over the document table.
- Password verification is CPU intensive in the current login path: about 0.63 seconds per sequential login and about 2.4 seconds when four logins arrive together on this setup.
- The 200 random photos increased PostgreSQL relation size by 27.3 MiB. A rough linear estimate for 10,000 such photos is about 1.3 GiB of database space, before backups and transaction logs. Actual size depends on image content and maintenance.
- The temporary schema ended at 45.5 MiB for its 10,229 visits (including test writes), 500 marketers, city area catalog and photos. All temporary schemas were removed; a final check found zero benchmark schemas.

## Functional checks

`npm test` passed 49/49 backend tests. The six frontend test files passed 28/28 tests with `node --test src/domain/*.test.js src/services/*.test.js`. `npm run build` passed. PDF import tests emitted non-failing `standardFontDataUrl` warnings. The benchmark requests returned no errors in the corrected run. This does not replace a real phone test or a multi-day production soak.

## Reproduce

From `backend/`, run `npm run db:benchmark-local`. The script is guarded to run only against `school_visit_local` at `127.0.0.1` or `localhost` on port 5433. Set `BENCHMARK_BURST_USERS=1` for the 20/25-user burst test, or `BENCHMARK_SOAK_SECONDS=120` for the two-minute mixed run. It cleans up its isolated schema in a `finally` block.
