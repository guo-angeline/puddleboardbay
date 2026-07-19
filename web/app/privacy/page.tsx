import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Paddle to Water",
  description:
    "What Paddle to Water collects, why, who processes it, and how to get it deleted. Anonymous by default: no account is needed to use the map.",
};

const LAST_UPDATED = "July 16, 2026";

// Every claim on this page must be verified against the code, not asserted.
// The lawyer gate caught TWO false claims in the first draft of this page,
// before it shipped: it said unsubscribe "deletes your subscription" (the route
// does update({enabled:false}), it never deletes) and it told users to opt out
// via Do Not Track (respect_dnt is unset, so posthog-js ignores DNT). A policy
// that overstates what you withhold is worse than no policy: that is the FTC
// Act section 5 shape. lib/privacy-accuracy.test.ts now pins both.
//
// Verified against:
// - Supabase tables: supabase/migrations/*.sql
// - PostHog config (autocapture, pageview/pageleave, localStorage+cookie
//   persistence, person profiles via $set_once): components/PostHogProvider.tsx
// - localStorage keys: ptw-favorites, ptw-internal
// - Geolocation never leaves the device: HomeClient reads coords into state for
//   distanceMiles() only; no track*/fetch call carries lat/lng. Do not weaken
//   that without changing this page in the same commit.
// - Unsubscribe behavior: app/api/email/unsubscribe/route.ts. It sets
//   enabled=false + an unsub_at churn stamp and does NOT delete, on purpose:
//   unsub_at is load-bearing for the reachable-audience metric in
//   analytics/queries/enrollment_return_funnel.sql:163. Deleting the row would
//   silently break the retention read. The copy says what the code does.
// - DNT: components/PostHogProvider.tsx does not set respect_dnt, so it is
//   false by default and DNT is ignored. The page discloses that plainly, which
//   is what CalOPPA 22575(b)(5) actually requires (a disclosure, not compliance).
//
// If you change what is collected, change this page in the SAME commit.

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2
        style={{
          fontFamily: "'Newsreader', serif",
          fontSize: "1.25rem",
          fontWeight: 600,
          color: "var(--dark)",
          marginBottom: "0.625rem",
          lineHeight: 1.3,
        }}
      >
        {title}
      </h2>
      <div style={{ fontSize: "0.9375rem", lineHeight: 1.65, color: "var(--text, #1C1A17)" }}>{children}</div>
    </section>
  );
}

const rowStyle: React.CSSProperties = {
  padding: "0.75rem 0",
  borderTop: "1px solid var(--border)",
};

export default function PrivacyPage() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        overflowY: "auto",
        overscrollBehavior: "contain",
        WebkitOverflowScrolling: "touch",
        background: "var(--bg)",
        color: "var(--dark)",
        fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
        padding:
          "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)",
      }}
    >
      <div style={{ maxWidth: "672px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            fontSize: "0.875rem",
            color: "var(--muted)",
            textDecoration: "none",
            marginBottom: "2rem",
          }}
        >
          ← Back to map
        </Link>

        <h1
          style={{
            fontFamily: "'Newsreader', serif",
            fontSize: "2rem",
            fontWeight: 700,
            color: "var(--dark)",
            marginBottom: "0.5rem",
            lineHeight: 1.2,
          }}
        >
          Privacy Policy
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--muted)", marginBottom: "2rem" }}>
          Last updated: {LAST_UPDATED}
        </p>

        <p
          style={{
            fontSize: "1rem",
            lineHeight: 1.65,
            color: "var(--dark)",
            marginBottom: "2.5rem",
            paddingLeft: "0.875rem",
            borderLeft: "3px solid var(--accent)",
          }}
        >
          You can browse every spot on this site without an account and without telling us who you are. We
          only get your email address if you ask for paddle alerts. We do not sell anything, we run no
          advertising, and we do not track you across other websites.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <Section title="What we collect">
            <p style={{ marginBottom: "0.75rem" }}>Only these four things, and three of them are your choice:</p>

            <div style={rowStyle}>
              <strong>Analytics, on every visit.</strong> We use PostHog to count page views, clicks, and which
              spots get opened. It stores a random ID in your browser (a cookie and local storage) so repeat
              visits from the same browser count as one person, and it records your approximate location from
              your IP address, your device type, and the site that referred you. That random ID is not your
              name, and we have no way to turn it into your name.
            </div>

            <div style={rowStyle}>
              <strong>Your saved spots, if you save any.</strong> These live in your own browser&apos;s local
              storage. They are not sent to us, and they do not follow you to another device or browser.
            </div>

            <div style={rowStyle}>
              <strong>Your email address, only if you sign up for paddle alerts.</strong> We store it with the
              spots you asked to watch, and a record of which alerts we sent you and which you opened, so we
              do not send the same alert twice and can tell whether the alerts are useful.
            </div>

            <div style={rowStyle}>
              <strong>A push subscription, only if you turn on push alerts.</strong> Your browser gives us an
              anonymous address it can deliver notifications to, plus the keys needed to encrypt them and your
              browser&apos;s user-agent string. It does not contain your email or your name.
            </div>

            <p style={{ marginTop: "1rem" }}>
              <strong>Your location stays on your device.</strong> If you use &quot;Near me&quot; and allow
              location access, your coordinates are used inside your browser to sort spots by distance. They
              are never sent to us, never stored, and never attached to an analytics event.
            </p>
          </Section>

          <Section title="Why we collect it">
            <p>
              Analytics tell us which parts of the site actually get used, so we fix the parts that do not.
              Email and push details exist to send you the alert you asked for, to manage your subscription
              (including not asking again for an address we already have), and to let you stop it. We do not
              use any of it for anything else.
            </p>
          </Section>

          <Section title="Who else processes it">
            <p style={{ marginBottom: "0.75rem" }}>
              We are one person, not a company with a data centre. These services run parts of the site and
              handle your data on our behalf:
            </p>
            <ul style={{ paddingLeft: "1.125rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <li>
                <strong>Vercel</strong> hosts the site and sees the requests your browser makes to it.
              </li>
              <li>
                <strong>Supabase</strong> is the database that stores email subscriptions and push
                subscriptions.
              </li>
              <li>
                <strong>PostHog</strong> (United States) processes the analytics described above.
              </li>
              <li>
                <strong>Resend</strong> delivers the alert emails.
              </li>
              <li>
                <strong>The National Weather Service</strong> provides the forecasts. We ask it about the
                weather at a spot, never about you.
              </li>
            </ul>
            <p style={{ marginTop: "0.75rem" }}>We do not sell or share your data with anyone else.</p>
          </Section>

          <Section title="Cookies and Do Not Track">
            <p style={{ marginBottom: "0.75rem" }}>
              PostHog sets a cookie, plus a local-storage entry, to hold the random analytics ID described
              above. We set no advertising cookies and no cross-site cookies, and no third party collects
              information about what you do on other websites through this one. Blocking cookies for this site
              costs you nothing: everything still works, and we simply cannot tell your second visit from your
              first.
            </p>
            <p>
              Some browsers can send a &quot;Do Not Track&quot; signal. There has never been a common standard
              for what it should mean, and this site does not currently respond to it. We would rather say that
              plainly than imply a protection you are not getting. Blocking cookies for this site is the
              reliable way to opt out.
            </p>
          </Section>

          <Section title="How long we keep it">
            <p style={{ marginBottom: "0.75rem" }}>
              Unsubscribing stops the emails immediately. We keep the record, marked unsubscribed, so that we
              do not email you again by mistake and so we can tell how many people stay subscribed. It is not
              deleted automatically. If you want it gone entirely, ask us and we will delete it.
            </p>
            <p style={{ marginBottom: "0.75rem" }}>
              Push alerts stop as soon as you turn off notifications. Your browser stops accepting them right
              away, and we mark the subscription dead the next time we try to send to it. That record is not
              deleted automatically either. Same offer: ask, and it is gone.
            </p>
            <p>
              Records of which alerts we sent and which you opened sit alongside your subscription and go with
              it when we delete it. Analytics data is retained by PostHog under its own retention schedule.
              Saved spots live on your device, so they last until you clear your browser storage.
            </p>
          </Section>

          <Section title="Your choices">
            <ul style={{ paddingLeft: "1.125rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <li>
                <strong>Stop emails:</strong> use the unsubscribe link in any alert. One click, no login, and
                the emails stop immediately.
              </li>
              <li>
                <strong>Stop push alerts:</strong> turn off notifications for this site in your browser or
                phone settings.
              </li>
              <li>
                <strong>Clear saved spots:</strong> clear this site&apos;s data in your browser.
              </li>
              <li>
                <strong>Opt out of analytics:</strong> block cookies for this site, or use your browser&apos;s
                tracking protection. Both work, and neither breaks anything.
              </li>
              <li>
                <strong>Ask us for a copy, a correction, or a deletion:</strong> email{" "}
                <a href="mailto:hello@paddletowater.com" style={{ color: "var(--accent)" }}>
                  hello@paddletowater.com
                </a>{" "}
                and we will do it. You do not have to live in a particular state, and you do not need a reason.
              </li>
            </ul>
          </Section>

          <Section title="Children">
            <p>
              This site is meant for adults planning a paddle. It is not directed at children, and we do not
              knowingly collect anything from anyone under 13. If you believe a child has given us their email
              address, write to us and we will delete it.
            </p>
          </Section>

          <Section title="Changes">
            <p>
              If we start collecting something new, we will update this page and change the date at the top
              before we collect it, not after.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              Questions, or want your data gone? Email{" "}
              <a href="mailto:hello@paddletowater.com" style={{ color: "var(--accent)" }}>
                hello@paddletowater.com
              </a>
              .
            </p>
          </Section>
        </div>

        <p
          style={{
            fontSize: "0.8125rem",
            color: "var(--muted)",
            marginTop: "2.5rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid var(--border)",
          }}
        >
          See also the{" "}
          <Link href="/disclaimer" style={{ color: "var(--accent)" }}>
            Disclaimer
          </Link>{" "}
          for how to think about the spot data and conditions on this site.
        </p>
      </div>
    </div>
  );
}
