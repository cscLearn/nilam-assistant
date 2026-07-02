# Changelog

## 2.0.7 - 2026-07-02

- Restore the 1.4.0 stable selector and star-click logic after the V2 rollback.
- Migrate old saved index progress into local used-book records.
- Make confirmation detection less brittle and preserve the submitted book while moving to the next record.

## 2.0.6 - 2026-07-02

- Re-save the userscript without UTF-8 BOM so Tampermonkey can read metadata cleanly.

## 2.0.5 - 2026-07-02

- Restore the stable 1.2.x direct AINS autofill flow.
- Remove the V2 fetch interception and Cloudflare sync path that made form filling brittle.
- Keep only local used-book tracking and fixed-date filling.

## 1.3.0 - 2026-07-02

- Use the selected panel date directly instead of adding the book index to it.
- Add stronger AINS date-field and five-star detection.
- Track used book IDs locally and hide them from the next records by default.

## 1.1.2 - 2026-07-01

- Format ISBN values with language-appropriate hyphen groups.

## 1.1.1 - 2026-07-01

- Format ISBN values with hyphens before filling the AINS ISBN field.

## 1.1.0 - 2026-07-01

- Restore automatic AINS form filling from the older local script.
- Fill page 1 fields, category, language, physical book type, and date.
- Fill summary, lesson, five-star rating, and scroll to submit area on page 2.

## 1.0.0 - 2026-07-01

- Initial Tampermonkey script.
- Load NILAM book data from GitHub raw.
- Add source, category, and language filters.
- Add previous, next, random, and copy buttons.
