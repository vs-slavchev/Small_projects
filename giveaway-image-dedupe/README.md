# Giveaway Deduplicator

Removes duplicate giveaway entries based on photo content. Each unique photo may appear only once in the output — if the same photo was submitted multiple times across any number of accounts, only the earliest submission is kept.

## Rules

| Situation | Result |
|---|---|
| Same photo submitted multiple times (any accounts) | Only the earliest submission is kept |
| Same person, different photos | All entries kept — this is allowed |
| Different people, same photo | Only the earliest submission is kept |

Photos are compared by decoding the actual image pixels, so two photos count as the same even if they have different filenames, upload dates, or metadata. A resized or re-cropped copy is treated as a different photo.

Submission order is determined by a date/time column in the file, which is detected automatically. If no date column is found, row order in the file is used instead.

## Output

The tool saves a new file next to your original with `-DEDUPLICATED` added to the name (e.g. `entries.xlsx` → `entries-DEDUPLICATED.xlsx`). Your original file is never modified.

A `duplicates_removed` column is added to show how many duplicate entries were collapsed into each kept row.

After processing, the app shows a summary including:
- How many entries were kept and removed
- The top 3 accounts with the most duplicate submissions
- How many photos appeared across multiple accounts
- The most-submitted photo and which accounts submitted it
- Giveaway period (first and last submission dates) and average submissions per day

## Requirements

The Excel file must have:
- A column with direct image URLs (starting with `http`, ending in `.jpg`, `.png`, `.jpeg`, `.webp`, etc.)
- Optionally: a column with email addresses (used for per-account stats)
- Optionally: a column with submission timestamps (used to pick the earliest submission when duplicates exist)

All columns are detected automatically from the data — no configuration needed.

---

## Setup (for the person building the `.exe`)

You need a Windows machine with Python installed, or let the build script install it for you.

**One step:**

```
build.bat
```

This will:
1. Download and install Python 3.12 silently if not already present (no administrator rights required)
2. Install the required packages (`requests`, `openpyxl`, `Pillow`, `python-dateutil`, `pyinstaller`)
3. Produce `dist\GiveawayDeduplicator.exe`

Send `GiveawayDeduplicator.exe` to whoever needs to run it. No installation required on their machine.

---

## Usage

1. Open `GiveawayDeduplicator.exe`
2. Click **Browse** and select your Excel file — processing starts immediately
3. Wait while photos are downloaded and compared (progress is shown)
4. Click **Open Output File** when done

Click the **?** button for a plain-language explanation of the rules.
