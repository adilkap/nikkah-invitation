# Amna & Adil — Nikkah Invitation

An elegant single-page digital Nikkah invitation with a wax-sealed envelope
that opens to reveal a carved Mughal-arch card, plus a small **guest-management
system** (personal RSVP links + an admin dashboard) backed by Supabase.

Plain HTML/CSS/JS — no build step. Hosts anywhere static (GitHub Pages, Vercel…).

---

## What's here

| File | Purpose |
|------|---------|
| `index.html` / `styles.css` / `script.js` | The invitation + envelope animation |
| `js/invite.js` | Personalises the invite from `?to=TOKEN` and handles RSVP |
| `admin.html` / `admin.js` / `admin.css` | Password-protected guest dashboard |
| `js/config.js` | Your Supabase URL + anon key (public, safe to commit) |
| `js/supabase.js` | Shared Supabase browser client |
| `supabase/schema.sql` | Table + RLS + RPCs — run once in Supabase |
| `assets/*.svg` | Hand-built arch, florals, envelope art |

---

## How the guest system works

- Each guest gets a unique link: `…/?to=<token>`. Their **name shows on the
  envelope**, and they can RSVP **accept/decline** and confirm **up to the number
  of seats** you invited them for. They can return and update it anytime.
- The **admin dashboard** (`admin.html`) lists every guest with seats invited,
  status, seats confirmed and notes; shows summary totals; lets you **add a
  guest** (with a per-guest invited count) and **copy their invite link**.

### Security model (important)
The browser uses the **anon public key** — that's fine. Real protection is in
the database:
- RLS is on and the public has **no table access**, so the guest list can't be
  scraped.
- Guests only reach their own row through two token-scoped `SECURITY DEFINER`
  functions (`get_invitation`, `submit_rsvp`).
- The admin gets full access **only when signed in as the allow-listed email**.

> The admin password is **never** stored in this repo. You set it on the
> Supabase user; the login form collects it at runtime.

---

## One-time setup

### 1. Create the Supabase project
1. New project at [supabase.com](https://supabase.com).
2. **Settings → API**: copy the **Project URL** and **anon public key** into
   `js/config.js`.

### 2. Create the database objects
**SQL Editor → New query →** paste all of `supabase/schema.sql` → **Run**.

### 3. Create the admin user (password login)
**Authentication → Users → Add user** →
- Email: `adilkapadia0@gmail.com`
- Password: *(choose your password)* — and **check "Auto-confirm user"**.

The email must match the one in `schema.sql`'s RLS policy and `ADMIN_EMAIL`
in `js/config.js`. To change the admin email later, update it in all three.

### 4. Run it
Open `admin.html`, sign in, add a guest, copy their link, and test the RSVP.

---

## Run locally

```bash
python3 -m http.server 8000
# invite:  http://localhost:8000/index.html?to=SOME_TOKEN
# admin:   http://localhost:8000/admin.html
```

(The Supabase JS client is loaded from a CDN, so you need an internet connection.)

---

## Customise

- **Couple's names / date / venue:** edit the `.names`, `.when`, `.venue`
  blocks in `index.html`. *(These are still placeholders.)*
- **Seal monogram:** the `<text>` inside `#seal`.
- **Colours / fonts:** CSS variables at the top of `styles.css`.

---

## Deploying

### GitHub Pages
Settings → Pages → Deploy from branch → `main` / root.
Already live at: `https://adilkap.github.io/nikkah-invitation/`

### Vercel (+ custom domain) — when you're ready
1. Import the GitHub repo in Vercel → **Deploy** (no build settings needed; it's
   static). You get a `*.vercel.app` URL.
2. **Project → Settings → Domains →** add your domain and follow the DNS steps
   (or buy the domain through Vercel). HTTPS is automatic.
3. In **Supabase → Authentication → URL Configuration**, add your new domain to
   **Site URL / Redirect URLs** so admin login works there too.

Invite links are origin-relative, so they keep working unchanged across
`github.io`, `vercel.app`, and your custom domain.
