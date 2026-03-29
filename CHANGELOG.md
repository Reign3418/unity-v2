# Unity Changelog

## [Unreleased]
### Fixed
- **Activity Tracker:** Resolved issue where `killPoints` failed to map accurately due to inconsistent case-sensitivity parsing from AWS DynamoDB. Aligned matrix extraction logic strictly with the 'getBehavioralMatrix' standard.
- **Global Analysis (Delta Engine):** Fixed a critical structural mapping bug where calculating dead troop deltas across the `Top N` subsets would result in 0. The bot ingestion engine (`awsDynamo.js -> uploadKingdomRoster`) now explicitly tracks `.deads` when slicing roster metrics.
- **AWS DynamoDB Retroactive Patch:** Generated and successfully deployed a backend node script (`repair_deads_db.mjs`) to iterate completely across the `SYSTEM#CONFIG` Tracked Kingdoms and retroactively calculate and inject historical `deads` variables into the master data summaries globally.
