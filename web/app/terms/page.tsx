import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Use and Release | Paddle to Water",
  description:
    "Terms of Use for paddletowater.com, including assumption of risk, a release and waiver of liability, warranty disclaimer, and limitation of liability.",
};

export default function TermsPage() {
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
        padding: "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)",
      }}
    >
      <div style={{ maxWidth: "672px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>

        {/* Back link */}
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

        {/* Heading */}
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
          Terms of Use and Release
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--muted)", marginBottom: "1.5rem" }}>
          Last updated: July 18, 2026
        </p>

        <p style={{ ...pStyle, fontWeight: 600, marginBottom: "2.5rem" }}>
          Please read these Terms carefully. They include an assumption of risk, a release
          and waiver of liability, and a limitation of liability that affect your legal
          rights. By using Paddle to Water, you agree to them.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

          <section>
            <h2 style={h2Style}>1. Who we are, and what this is</h2>
            <p style={pStyle}>
              Paddle to Water (&ldquo;the Site,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;) is a free
              informational website operated by an individual in California. It lists
              paddleboard and kayak launch spots in the San Francisco Bay Area and shows
              weather and conditions data compiled from public sources. It is a planning
              tool and nothing more. We are not a guide service, an outfitter, an
              instructor, or a safety authority, and we do not inspect, control, or manage
              any launch spot, waterway, or body of water.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>2. You accept these Terms by using the Site</h2>
            <p style={pStyle}>
              By using the Site, saving a spot, or turning on alerts, you agree to these
              Terms, to our <Link href="/disclaimer" style={linkStyle}>Disclaimer</Link>, and
              to our <Link href="/privacy" style={linkStyle}>Privacy Policy</Link>. If you do
              not agree, do not use the Site. If you are under 18, do not use the Site without
              a parent or guardian who agrees to these Terms on your behalf.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>3. Assumption of inherent risk</h2>
            <p style={pStyle}>
              Paddleboarding, kayaking, canoeing, and all water activities are dangerous.
              They carry inherent risks that no website can remove, including cold water,
              currents, tides, wind, waves, boat traffic, submerged hazards, weather that
              changes fast, equipment failure, capsizing, hypothermia, serious injury, and
              drowning and death. You understand and accept these risks. You are solely
              responsible for deciding whether any spot, on any given day, is safe for your
              skill, your equipment, and the conditions in front of you. You are responsible
              for wearing appropriate safety gear, checking current conditions yourself, and
              telling someone your plans before you launch. Conditions and data on the Site
              are guidance only, never a safety guarantee, and never a substitute for your own
              judgment on the water.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>4. The Site is provided &ldquo;AS IS,&rdquo; with no warranties</h2>
            <p style={pStyle}>
              All information on the Site, including spot locations, coordinates, fees,
              access, hours, parking, and all weather and conditions data, is compiled from
              public and third-party sources and may be wrong, incomplete, or out of date.
              Conditions data is not a forecast you should rely on for safety. The Site and
              everything on it are provided &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE,&rdquo;
              with all faults, and without warranties of any kind, express or implied,
              including implied warranties of merchantability, fitness for a particular
              purpose, accuracy, or non-infringement. We do not warrant that any spot is open,
              legal to access, safe, or accurately described, or that any data is accurate or
              current.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>5. Release and waiver of liability (ordinary negligence)</h2>
            <p style={pStyle}>
              To the fullest extent allowed by California law, you release, waive, and agree
              not to sue Paddle to Water and its owner (the &ldquo;Released Parties&rdquo;)
              from any and all claims for injury, death, property damage, or other loss
              arising out of or relating to your use of the Site or of any information on it,
              including claims based on the ordinary negligence of the Released Parties. This
              does not release, and nothing here attempts to release, gross negligence,
              recklessness, willful or intentional misconduct, fraud, or any liability
              California law does not permit to be waived.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>6. Limitation of liability</h2>
            <p style={pStyle}>
              To the fullest extent allowed by law, the Released Parties will not be liable
              for any indirect, incidental, consequential, special, or punitive damages. In
              any event, the total liability of the Released Parties to you for all claims
              relating to the Site will not exceed one hundred U.S. dollars ($100). Because
              the Site is free, this cap reflects the basis of the bargain. Some limitations
              may not apply where the law does not allow them.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>7. Indemnification</h2>
            <p style={pStyle}>
              You agree to indemnify and hold harmless the Released Parties from any claim,
              loss, liability, or expense (including reasonable attorneys&rsquo; fees) arising
              out of your use of the Site, your violation of these Terms, or your violation of
              any law or third-party right.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>8. No professional or safety advice</h2>
            <p style={pStyle}>
              Nothing on the Site is safety, medical, legal, or professional advice. We do
              not tell you a spot is safe to paddle. Any &ldquo;conditions,&rdquo;
              &ldquo;calm,&rdquo; or similar indicator is a convenience based on third-party
              data, not a determination that it is safe for you to go out.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>9. Access and permissions</h2>
            <p style={pStyle}>
              A spot appearing on the Site does not mean public access is legal, permitted, or
              currently available. Some spots may be private, permitted, or seasonally closed.
              Confirming your legal right to access any spot is your responsibility.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>10. Changes to these Terms</h2>
            <p style={pStyle}>
              We may update these Terms. Material changes will be posted here with a new date.
              Continued use after a change means you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>11. Governing law and venue</h2>
            <p style={pStyle}>
              These Terms are governed by the laws of the State of California, without regard
              to conflict-of-laws rules. You agree that any dispute will be brought
              exclusively in the state or federal courts located in San Francisco, California,
              and you consent to their jurisdiction.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>12. Severability</h2>
            <p style={pStyle}>
              If any part of these Terms is found unenforceable, the rest stays in effect, and
              the unenforceable part will be limited or removed only to the extent required.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>13. Contact</h2>
            <p style={pStyle}>
              Questions about these Terms:{" "}
              <a href="mailto:hello@paddletowater.com" style={linkStyle}>hello@paddletowater.com</a>
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}

const h2Style: React.CSSProperties = {
  fontFamily: "'Newsreader', serif",
  fontSize: "1.125rem",
  fontWeight: 700,
  color: "var(--dark)",
  marginBottom: "0.625rem",
};

const pStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  lineHeight: 1.75,
  color: "var(--dark)",
  margin: 0,
};

const linkStyle: React.CSSProperties = {
  color: "var(--accent)",
  textDecoration: "underline",
};
