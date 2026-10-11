# Astro Alok Tripathi

A responsive, bilingual website for Vedic astrology and Kundli consultation enquiries. The frontend uses plain HTML, CSS and JavaScript. A small Node.js backend serves the site, validates and saves enquiries, manages customer/admin sign-in and connects to the PostgreSQL database named `Astrology`.

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

## Accounts and article management

- Customers can create an account at `/signup.html`, sign in at `/login.html`, and see enquiries submitted while signed in at `/dashboard.html`. Customer sign-up does not grant admin access.
- Email is currently a sign-in name only. Email verification and password-reset messages are not enabled until an email delivery provider is configured.
- Create the astrologer's separate administrator account once, in an interactive terminal, with `npm run create-admin -- astrologer@example.com`. Enter the password at the hidden prompt; use a unique password of at least 12 characters. The command refuses to create another admin once one exists. Do not put the password in a command, source file or `.env`.
- Only the astrologer admin can see all enquiries or create/edit/publish bilingual website articles. Admin article content is plain text. Published admin articles appear in the Website Articles section of `articles.html`; existing Blogger archive posts continue to load from the original blog feed.
- To create or edit a website article, sign in as the astrologer admin and use the article editor in `/dashboard.html`. The separate **Write or manage articles** link on the Articles page opens Blogger and is only for maintaining the existing Blogger archive.
- Enquiries submitted while signed out are saved for the astrologer but are not associated with a customer account. Sign in before submitting to see an enquiry in that customer's dashboard.
- Signed-in customer accounts can start one-to-one, text-only chat with the astrologer from their dashboard. Chat requires separate consent, is stored in `public.astro_chat_messages`, and is delivered in real time over an authenticated same-origin WebSocket when participants are connected. It is not end-to-end encrypted and is not continuously monitored.
- Signed-in customers can submit or update one 1–5-star written review at `feedback.html`. Reviews publish immediately after explicit consent. Public reviews display only as “Customer,” not with a name or email; the astrologer can remove them from the dashboard.

## Configure before launch

1. In `assets/site-config.js`, set `siteUrl` to the final HTTPS origin (for example, `https://astroaloktripathi.in`) to enable canonical and social URL metadata. Leave it empty until the domain is selected.
2. The supplied transparent headshot PNG is used as the logo and on the homepage/About page. The separate supplied full-length portrait `assets/alok-tripathi-standing.png` appears in the homepage hero. Both are displayed with transparent backgrounds; keep these approved images unchanged unless the owner supplies replacements.
3. Add verified biography and professional background details where indicated. Add the confirmed business location if it should be public. No address, credentials, testimonials, fees, or office hours are assumed.
4. Review the privacy policy and terms for the owner's actual practices and obtain appropriate legal review before launch.
5. Confirm that WhatsApp number `+91 83194 82309` is correct and can receive enquiries.
6. The Articles page depends on the public Blogger feed at `alokranjantripathi.in`; keep the blog public for the live archive to load. If the feed is unavailable, visitors can still open the original blog from the page.
7. To maintain the existing Blogger archive, use **Write or manage articles** on the Articles page and sign in to the existing Google/Blogger owner account. Publish the post on Blogger for it to appear in the public archive; unpublished drafts stay private. The website does not collect Blogger passwords or publish posts directly. Website articles are created separately in the astrologer's admin dashboard.

Suggested domain options, subject to availability: `astroaloktripathi.com`, `astroaloktripathi.in`, and `aloktripathiastro.com`.

## Deploy

The site now requires a Node.js host and PostgreSQL; static-only hosting does not support the forms, accounts or article editor. Deploy the files and `assets` directory with the Node server, configure the `PG*` environment variables and `NODE_ENV=production`, and provide HTTPS at the host or its reverse proxy. Keep the database private and do not commit `.env`. Configure the selected domain and set `siteUrl` above.

Consultation forms validate in the browser and server, save an enquiry to PostgreSQL, and then open an encoded WhatsApp draft. The visitor must review and send the message in WhatsApp; saving or submitting an enquiry does not confirm an appointment. Configure production HTTPS and a host/reverse proxy that supports WebSockets for live chat. Use a trusted production email provider before enabling email verification or password recovery, and review the privacy policy and retention practices before launch.
