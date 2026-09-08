<div align="center">

```
 ██████╗ ██████╗ ██╗     ██╗     ███████╗ ██████╗████████╗██╗ ██████╗ ███╗   ██╗
██╔════╝██╔═══██╗██║     ██║     ██╔════╝██╔════╝╚══██╔══╝██║██╔═══██╗████╗  ██║
██║     ██║   ██║██║     ██║     █████╗  ██║        ██║   ██║██║   ██║██╔██╗ ██║
██║     ██║   ██║██║     ██║     ██╔══╝  ██║        ██║   ██║██║   ██║██║╚██╗██║
╚██████╗╚██████╔╝███████╗███████╗███████╗╚██████╗   ██║   ██║╚██████╔╝██║ ╚████║
 ╚═════╝ ╚═════╝ ╚══════╝╚══════╝╚══════╝ ╚═════╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
                          T R A C K E R
```

### A self-hosted vinyl & media collection manager, powered by the Discogs API

[![Backend](https://img.shields.io/badge/backend-Django%205-092E20?logo=django&logoColor=white)](backend/)
[![Frontend](https://img.shields.io/badge/frontend-React%2018-61DAFB?logo=react&logoColor=white)](frontend/)
[![Styling](https://img.shields.io/badge/UI-Tailwind%20v4%20%2B%20shadcn%2Fui-06B6D4?logo=tailwindcss&logoColor=white)](frontend/)
[![Build](https://img.shields.io/badge/build-Vite%205-646CFF?logo=vite&logoColor=white)](frontend/)
[![Deploy](https://img.shields.io/badge/deploy-Docker%20Compose-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![License](https://img.shields.io/badge/license-Unreleased-lightgrey)](#-license)

</div>

<br/>

<div align="center">

## ✨ About

**Collection Tracker** is a self-hosted app for cataloguing a physical media collection —
records, discs, tapes, whatever you collect. Search Discogs, pull in full release metadata
in one click, sort everything into a **Collection** and a **Wishlist**, organize by folder,
and see your whole library summarized on a stats dashboard.

No spreadsheets. No third-party lock-in. Your data, your server.

</div>

<br/>

## 🚀 Features

- 🔍 **Discogs-powered search** — look up releases by artist, title, or catalog number directly against the Discogs API
- 📥 **One-click import** — pull full release metadata (label, format, country, genre, year, cover art) straight into your library
- 🗂️ **Collection & Wishlist** — keep owned items and want-list items separate, and move items between the two
- 📁 **Custom folders** — organize releases into folders, with conflict handling for Discogs-imported vs. user-created folders
- ⭐ **Personal ratings & conditions** — track your own 5-star rating plus media/sleeve condition (Mint → Poor)
- 💰 **Value tracking** — record estimated value and marketplace listings per release
- 📊 **Stats dashboard** — visual breakdowns of your collection (via Recharts)
- 📤📥 **CSV import/export** — dry-run + commit import flow for bulk Discogs CSV exports, plus one-click export
- 🎛️ **Sort & filter** — sortable, filterable collection and wishlist views built on TanStack Table
- 🌗 **System-aware theming** — light/dark mode that follows your OS, built with shadcn/ui + Radix primitives
- 📱 **Responsive layout** — sidebar navigation on desktop, bottom nav on mobile

<br/>

## 🧱 Tech Stack

| Layer      | Stack |
|------------|-------|
| Frontend   | React 18, Vite 5, Tailwind CSS v4, shadcn/ui, Radix UI, Framer Motion, TanStack Table, Recharts |
| Backend    | Django 5, Django REST Framework, django-cors-headers |
| Data       | SQLite (default), Discogs REST API |
| Deployment | Docker Compose (Gunicorn + Nginx) |

<br/>

## 📦 Installation

### Prerequisites

- **Python** 3.11+
- **Node.js** 18+
- A [Discogs personal access token](https://www.discogs.com/settings/developers)

### 1. Clone & configure

```bash
git clone <this-repo-url>
cd "Collection Tracker"
cp .env.example .env
```

Fill in `.env`:

```dotenv
DISCOGS_TOKEN=your-discogs-personal-access-token
DISCOGS_USER_AGENT=CollectionTracker/1.0 +https://yourdomain.example
DJANGO_SECRET_KEY=change-me-in-production
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

<br/>

## ⚡ Quick Start

Once both servers are running:

1. Open the frontend dev server (Vite prints the local URL, typically `http://localhost:5173`)
2. Head to **Search**, look up a release from Discogs
3. Add it to your **Collection** or **Wishlist**
4. Organize into **Folders**, set ratings/conditions, and check the **Stats** page for an overview

### Bulk import from a Discogs CSV export

```bash
# 1. Upload your Discogs collection CSV export via the CSV Import panel
# 2. Review the dry-run diff (new releases, folder conflicts, duplicates)
# 3. Commit the import
```

<br/>

## 🐳 Docker Deployment

Ship the whole stack — Django + Gunicorn behind the scenes, React served by Nginx:

```bash
docker compose up -d --build
```

| Service   | Exposed as       |
|-----------|------------------|
| `backend`  | internal only (`8000`) |
| `frontend` | `http://localhost:8080` |

Environment variables (`DISCOGS_TOKEN`, `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, etc.) are read from your shell or an `.env` file alongside `docker-compose.yml`.

<br/>

## 🗺️ API Overview

| Endpoint | Purpose |
|----------|---------|
| `GET /health/` | Health check |
| `GET /folders/` · `POST /folders/` | List / create folders |
| `GET /releases/` | List releases (collection + wishlist) |
| `GET /releases/<id>/` | Release detail |
| `POST /releases/wishlist/` | Add release to wishlist |
| `POST /releases/collection/` | Add release to collection |
| `POST /releases/<id>/move-to-collection/` | Promote a wishlist item |
| `GET /discogs/search/` | Search the Discogs catalog |
| `GET /discogs/release/<id>/` | Fetch full Discogs release metadata |
| `POST /import/discogs-csv/dry-run/` · `POST /import/discogs-csv/commit/` | CSV import flow |
| `GET /export/discogs-csv/` | Export your collection as CSV |
| `GET /stats/` | Aggregate collection statistics |

<br/>

## 📄 License

No license has been published for this project yet. All rights reserved unless a license file is added.

<br/>

<div align="center">

Built for collectors, by a collector. 🎧

</div>
