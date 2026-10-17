# Astro Alok Tripathi

A responsive, bilingual website for Vedic astrology and Kundli consultation enquiries. The frontend uses plain HTML, CSS and JavaScript. A small Node.js backend serves the site, validates and saves enquiries, manages customer sign-in and connects to the PostgreSQL database named `Astrology`.

## Project folders

- `frontend/` contains the website pages and `frontend/assets/` contains CSS, browser JavaScript, and images.
- `backend/` contains the Node.js server, authentication code, and backend tests in `backend/test/`.
- `database/` contains the PostgreSQL schema and database scripts.
- `package.json`, `.env`, and `render.yaml` stay in the project root as development and deployment configuration.

The owner's supplied transparent headshot PNG remains the logo in the shared header, footer, and browser favicon, and the portrait on the homepage and About page. A separate transparent full-length portrait appears on the right side of the homepage hero. The homepage includes a privacy-enhanced YouTube playlist embed for the owner's channel (`@alokranjan889`), with direct links to the channel. The Articles page loads public posts from the owner's Blogger archive and owner-created bilingual website articles. A signed-in customer and the astrologer can also chat privately in real time; text messages are stored in PostgreSQL. Signed-in customers can submit one public 1–5-star review, shown anonymously and published immediately with their consent. A slow animated celestial 3D background appears across pages and respects reduced-motion preferences.

## Requirements

- Node.js 20.6 or newer and npm.
- PostgreSQL running locally.
- A PostgreSQL role that can connect to the database and create tables.

## Configure PostgreSQL

Create the database in PostgreSQL. PostgreSQL folds unquoted names to lowercase; the quoted command below creates the exact mixed-case name `Astrology`:

```powershell
createdb -U postgres --maintenance-db=postgres "Astrology"
```

Alternatively, in `psql` connected to the `postgres` maintenance database, run `CREATE DATABASE "Astrology";`. If the database already exists, do not create it again.

Copy `.env.example` to `.env` and enter the local PostgreSQL host, port, username and password. In PowerShell:

```powershell
Copy-Item .env.example .env
notepad .env
```

Keep `.env` private; it is excluded from version control. The website server connects to the selected database and creates or updates its tables from `database/schema.sql` on startup. Enquiry data is stored in `public.consultation_enquiries`, account data in `public.astro_users` and `public.login_sessions`, and owner-created articles in `public.site_articles`.

Install and run:

```powershell
npm install
npm start
```

Visit `http://localhost:8000`. Do not use a static-only server such as `python -m http.server` for forms or sign-in; those features require the Node API.

Run the backend and account tests with `npm test`.

## Accounts

- Customers can create an account at `/signup.html`, sign in at `/login.html`, and view their own enquiries at `/dashboard.html`.
- Signup and sign-in create a persistent customer session. The header shows the account link and a **Log out** button while signed in. Successful signup and sign-in return to the home page.
- There is no public astrologer account or astrologer sign-in. Public signup can only create customer accounts.
- Email verification and password-reset messages are not enabled until an email delivery provider is configured.
- Signed-in customers can start a one-to-one, text-only chat from their account and submit one anonymous public review. Reviews publish immediately after explicit consent.

## Configure before launch

1. In `frontend/assets/site-config.js`, set `siteUrl` to the final HTTPS origin (for example, `https://astroaloktripathi.in`) to enable canonical and social URL metadata. Leave it empty until the domain is selected.
2. The supplied transparent headshot PNG is used as the logo and on the homepage/About page. The separate supplied full-length portrait `frontend/assets/alok-tripathi-standing.png` appears in the homepage hero. Both are displayed with transparent backgrounds; keep these approved images unchanged unless the owner supplies replacements.
3. Add verified biography and professional background details where indicated. Add the confirmed business location if it should be public. No address, credentials, testimonials, fees, or office hours are assumed.
4. Review the privacy policy and terms for the owner's actual practices and obtain appropriate legal review before launch.
5. Confirm that WhatsApp number `+91 83194 82309` is correct and can receive enquiries.
6. The Articles page depends on the public Blogger feed at `alokranjantripathi.in`; keep the blog public for the live archive to load. If the feed is unavailable, visitors can still open the original blog from the page.
7. Publish posts on the original Blogger site; the public archive on this website reads from that blog feed.

Suggested domain options, subject to availability: `astroaloktripathi.com`, `astroaloktripathi.in`, and `aloktripathiastro.com`.

## Deploy to Render

This repository includes `render.yaml` for a Render Node.js Web Service and PostgreSQL database. The service uses `npm ci` to install dependencies and runs `node backend/server.cjs` with the environment variables configured in Render. Render supplies `PORT`; the server binds to `0.0.0.0`. The WebSocket client uses the page's HTTPS scheme to connect over WSS, and the server validates the public request origin, so same-origin chat works through Render's HTTPS proxy.

To deploy:

1. Push this project, including `render.yaml`, to the GitHub branch you want Render to deploy.
2. Sign in to Render and open the Dashboard. Click **New +** → **Blueprint**.
3. Connect GitHub if prompted, then select the `Astrology` repository and branch.
4. Render reads `render.yaml` and shows the Web Service and PostgreSQL database it will create. Review the resources and click **Apply**.
5. When prompted for `WHATSAPP_NUMBER`, enter the public WhatsApp number as digits only, including the country code. The current project number is `918319482309`. This value controls the `wa.me` destination and is public to website visitors; no WhatsApp API token is used by this project.
6. Wait for the Blueprint deploy to finish. Open the Web Service's `onrender.com` URL and check the home page, consultation form, sign-in page, and signed-in chat.

Render creates `DATABASE_URL` from the database's private connection string and sets `NODE_ENV=production`; `PORT` is supplied by Render automatically. Set `WHATSAPP_NUMBER` during Blueprint setup or later on the service's **Environment** page. No database credentials need to be copied into the repository. The database schema initializes when the server starts.

The Blueprint currently selects Render's Free plans to avoid assuming a paid plan. Render's free PostgreSQL databases expire 30 days after creation and are intended for evaluation, not long-term production data. Before relying on customer accounts or enquiry data, change the database plan to a paid plan in `render.yaml` and sync the Blueprint. [Render's Free instance limits](https://render.com/docs/free)

Consultation forms save enquiries to PostgreSQL and open a WhatsApp draft; the visitor must send it in WhatsApp. The project does not use WhatsApp API credentials. The Blogger archive continues to load from its existing public feed and needs no Render secret variables. Set `siteUrl` in `frontend/assets/site-config.js` after choosing a production domain if canonical and social metadata should use it.

Use a trusted production email provider before enabling email verification or password recovery, and review the privacy policy and data-retention practices before launch.
