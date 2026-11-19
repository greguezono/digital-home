# digital-home

My digital home page, professional and personal. 

Live: https://greguezono.github.io/digital-home/

`index.html` is self-contained and generated from aggregate monthly PR stats. No repository names or PR contents are included.

## Refresh

`scripts/refresh.py` pulls PRs with `gh`, rebuilds `index.html` from `template.html` through the last complete month, and with `--publish` commits and pushes it. Raw pulls are cached in `.cache/` (gitignored).

A launchd job runs it with `--if-stale` on the 1st of each month at 09:00 and at login. launchd runs a missed 09:00 slot when the Mac wakes; the login run covers a Mac that was off. Either way `--if-stale` exits in about 0.1 seconds with no network calls once the last complete month is published, so the report refreshes once per month:

```sh
cp scripts/com.greguezono.digital-home-refresh.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.greguezono.digital-home-refresh.plist
```

Logs: `~/Library/Logs/digital-home-refresh.log`.

## Profile cards

`scripts/profile_card.py` writes the chart cards for the [GitHub profile README](https://github.com/greguezono) from the cached data, with no network calls: `digital-home-{wide,compact}-{dark,light}.svg`. The wide 880×400 card is for desktop; the compact 600×600 card is for phones. Run it manually after a refresh, then commit the profile repo:

```sh
python3 scripts/profile_card.py --out ../greguezono/assets   # default --out
```
