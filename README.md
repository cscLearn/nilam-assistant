# NILAM Assistant

Tampermonkey helper for reading NILAM book records from:

```text
https://github.com/cscLearn/nilam-book-database
```

## Install

Open this raw URL in the browser with Tampermonkey installed:

```text
https://raw.githubusercontent.com/cscLearn/nilam-assistant/main/tampermonkey/nilam-assistant.user.js
```

Tampermonkey will show the install/update screen.

## What It Does

- Loads `books-all.json` from GitHub raw.
- Filters by `source`, `category`, and `language`.
- Shows one book record at a time.
- Copies common fields for manual form filling.

It does not bypass login or submit AINS records automatically.
