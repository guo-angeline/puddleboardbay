import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Disclaimer | Paddle to Water",
  description:
    "Important information about the accuracy of spot data, inherent risks of water activities, and limitations of liability for paddletowater.com.",
};

export default function DisclaimerPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
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
          Disclaimer
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--muted)", marginBottom: "2.5rem" }}>
          Last updated: June 2, 2026
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

          {/* Section */}
          <section>
            <h2 style={h2Style}>Accuracy of information</h2>
            <p style={pStyle}>
              Spot details on Paddle to Water — including launch fees, access hours, parking,
              coordinates, and conditions — are compiled from public sources and community
              contributions. This information may be inaccurate, incomplete, or outdated.
              Fees change, access points close, and conditions vary by season. Always verify
              current conditions and access directly with the relevant park, marina, or land
              manager before visiting.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>Inherent risk of water activities</h2>
            <p style={pStyle}>
              Paddleboarding, kayaking, canoeing, and all water-based activities carry
              inherent physical risk, including serious injury or death. Paddle to Water
              does not provide safety instruction, equipment recommendations, or guidance
              on water conditions. You are solely responsible for assessing whether a
              location is safe for your skill level, equipment, and the conditions on the
              day of your visit. Always wear appropriate safety gear and inform someone of
              your plans before launching.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>Access and permissions</h2>
            <p style={pStyle}>
              Some listed spots may be on private property, within areas that require
              permits, or subject to seasonal closures and restrictions. A spot appearing
              on this site does not imply that public access is legal, permitted, or
              currently available. It is your responsibility to confirm that you have legal
              right of access before launching from any location.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>Location accuracy</h2>
            <p style={pStyle}>
              Map pin coordinates are approximate and may not precisely reflect the exact
              launch point. Pins may be offset from the actual water access due to
              geocoding limitations. Use the &ldquo;Get Directions&rdquo; link in each
              spot for navigation, and confirm the launch area on arrival.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>Limitation of liability</h2>
            <p style={pStyle}>
              Paddle to Water and its owner are not responsible for any personal injury,
              property damage, fines, legal consequences, or other losses arising from the
              use of information on this site. This site is provided &ldquo;as is&rdquo;
              without warranties of any kind, express or implied.
            </p>
          </section>

          <section>
            <h2 style={h2Style}>Reporting corrections</h2>
            <p style={pStyle}>
              If you find inaccurate or outdated information, please use the{" "}
              <strong>Feedback</strong> button on the{" "}
              <Link href="/" style={linkStyle}>main page</Link>. Community reports
              help keep this resource accurate for everyone.
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
