# Tactile Task Console

A study and work organiser styled as a physical desk console: a combination-lock vault to sign in, a tilted walnut desk for your folders and works, stopwatch and countdown works, and file attachments for task sheets and finished work.

Built with React, Tailwind CSS and Motion on the front end, and a small Express API that stores everything in a JSON file on your own machine.

## Features

- **Vault sign-in** — your account is a 4–8 digit code dialled on a combination lock; an extra password is optional.
- **Folders and subfolders** — one per subject or project, up to five levels deep, with progress counts.
- **Works** — tasks inside a folder, with an optional due date.
- **Temporary works** — one-off jobs with a stopwatch that records how long they took.
- **Challenge works** — jobs raced against a countdown you set.
- **Marks** — bookmark, priority, under working and done on every folder and work.
- **Attachments** — keep the task sheet and what you handed in on each work (up to 25 MB per file).
- **Focus Crucible** — a distraction-free hourglass session for one work.
- **Live sync** — changes save instantly and appear in every open tab.
- **Tutorial** — an in-app guide at `/tutorial`.

## Run it

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

This starts the API on port 3001 and the web app on port 5173. Open http://localhost:5173.

## Where your data lives

Everything is stored locally in `api/data/` (ignored by git): `db.json` for accounts and workspaces, `secret.key` for hashing vault codes, and `files/` for attachments. Back that folder up if the contents matter.

## Security notes

This is a local, single-machine app, not a hosted service.

- A short numeric code is weak protection: anyone who guesses a code opens that vault. Wrong guesses are rate-limited, and the extra password adds a second lock.
- Codes and passwords are stored only as hashes.
- There is no code or password recovery.
- It serves plain HTTP. Put it behind HTTPS before exposing it to a network.

## Project layout

```
api/            Express API: auth, folders/works, clocks, file storage
src/pages/      Gatekeeper (vault), Workspace, Focus, Tutorial
src/components/ Dial, work cards, dialogs, shared pieces
src/lib/        API client, time and data helpers, sound
```
