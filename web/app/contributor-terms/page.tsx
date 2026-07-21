import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contributor Terms | Paddle to Water",
  description:
    "The terms that apply when you submit a review to paddletowater.com: content licence, moderation, your representations, and limitation of liability.",
};

// Item 43. This page publishes PART 1 ONLY of docs/legal/ugc-contributor-terms.md.
// That file also contains an internal provenance block and a "Part 2: open risks
// the owner is carrying", both of which are repo record and MUST NEVER be
// published. If you update the source document, update this page in the same
// commit and bump TERMS_VERSION + TERMS_HASH (lib/reviews/validation.ts and
// components/ReviewForm.tsx), because a contributor is bound only by the version
// they actually saw and accepted.
const VERSION = "Version 1.0. Last updated: July 21, 2026.";

export default function ContributorTermsPage() {
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
            marginBottom: "0.5rem",
            lineHeight: 1.2,
          }}
        >
          Contributor Terms
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--muted)", marginBottom: "1rem" }}>{VERSION}</p>
        <p style={{ ...pStyle, marginBottom: "2.5rem" }}>
          These Contributor Terms apply to everyone in the United States who submits a review to
          Paddle to Water. They are in addition to our{" "}
          <Link href="/terms" style={linkStyle}>Terms of Use and Release</Link>, our{" "}
          <Link href="/privacy" style={linkStyle}>Privacy Policy</Link>, and our{" "}
          <Link href="/disclaimer" style={linkStyle}>Disclaimer</Link>.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <Section title="1. What these terms cover and your acceptance">
            <p style={pStyle}>
              These Contributor Terms govern submitting reviews and other content to Paddle to
              Water. They are in addition to, and expressly incorporate by reference, the Site&rsquo;s
              Terms of Use and Release, its Privacy Policy, and its Disclaimer. If these Contributor
              Terms conflict with any of those documents: for any claim arising out of your
              submission of Content, Content published on the Site, or our moderation of Content,
              these Contributor Terms control; for every other claim, the Terms of Use and Release
              controls; and nothing in any of these documents narrows the safety disclaimers, the
              assumption of risk, or the release, all of which continue to apply in full.
            </p>
            <p style={pStyle}>
              You accept these Contributor Terms by checking the acknowledgment box shown before you
              submit any Content. The box is not checked for you. If you do not check it, your
              review is not submitted. You can still use the rest of the Site without agreeing; only
              the review feature requires these terms.
            </p>
          </Section>

          <Section title="2. Eligibility and account">
            <p style={pStyle}>
              You must be at least 18 years old to submit a review. The Site is not directed to
              children under 13, and we do not knowingly collect personal information from children
              under 13. If we learn a contributor is under 18, we will disable their ability to
              contribute and remove their Content. A parent or guardian who believes a child under
              13 has provided us personal information may contact us at{" "}
              <a href="mailto:hello@paddletowater.com" style={linkStyle}>hello@paddletowater.com</a>{" "}
              and we will delete it.
            </p>
            <p style={pStyle}>
              Posting requires signing in. You are responsible for activity under your account.
              One account per person, and one review per launch spot per account. We may rate-limit,
              refuse, or remove submissions to prevent fraud, spam, or manipulation.
            </p>
            <p style={pStyle}>
              <strong>Real experiences only.</strong> Submit reviews only for spots you have genuine,
              first-hand experience with. Do not post fake reviews, reviews you were paid or rewarded
              for without disclosing it, or reviews written on behalf of a business. If you have any
              material connection to a spot or a business named at a spot, including employment,
              ownership, a family relationship, or free or discounted goods or services, you must
              disclose it clearly in the review itself.
            </p>
          </Section>

          <Section title="3. The licence you grant us">
            <p style={pStyle}>
              You keep ownership of your Content. You grant us a non-exclusive, royalty-free,
              worldwide, sublicensable, transferable licence to host, store, reproduce, display,
              publicly perform, distribute, and format your Content for the purposes of operating,
              promoting, and improving the Site and its services, including the website and the
              native mobile app.
            </p>
            <p style={pStyle}>
              <strong>Formatting only. We do not rewrite your words.</strong> The licence to
              &ldquo;format&rdquo; is limited to non-substantive technical presentation: layout,
              truncation for previews, character escaping, and safe rendering. Our moderation is
              binary. We either publish your Content substantially as submitted, or we reject it in
              whole. If a submission would be publishable except for a discrete problem, such as a
              third party&rsquo;s phone number, we will reject it and invite you to resubmit rather
              than silently changing your words.
            </p>
            <p style={pStyle}>
              For Content we reject or later remove, and for Content removed because you deleted your
              account, we may retain an archived copy and a record of the moderation decision for
              fraud prevention, dispute handling, and legal defence, for up to three years, and
              longer only where a specific legal claim is pending or reasonably anticipated. These
              retained records are not publicly displayed.
            </p>
          </Section>

          <Section title="4. Your representations">
            <p style={pStyle}>
              By submitting Content you represent that: you own or have all rights necessary to
              submit it; it is your genuine, truthful, first-hand opinion or experience, and any
              statement of fact in it is accurate to the best of your knowledge; it does not defame
              any person or business, or violate anyone&rsquo;s privacy, publicity, or
              intellectual-property rights; it is not fake or undisclosed-paid; and it contains no
              personal information about third parties beyond what is reasonable to describe a
              public-facing business.
            </p>
          </Section>

          <Section title="5. Acceptable use">
            <p style={pStyle}>Reviews must be about the launch spot and your experience of it. Do not post:</p>
            <ul style={ulStyle}>
              <li>false statements of fact, or statements you present as fact that you cannot support;</li>
              <li>
                accusations that a person or business committed a crime, violated a law or
                regulation, or created a health or environmental hazard, unless you personally
                witnessed it and describe only what you personally witnessed;
              </li>
              <li>content that harasses, threatens, or targets a specific individual;</li>
              <li>hate speech, obscenity, or content sexualising minors;</li>
              <li>personal or private information about identifiable individuals;</li>
              <li>spam, advertising, or reviews written for or against a business you are connected to without disclosure;</li>
              <li>content that infringes copyright or trademark, or reproduces another site&rsquo;s reviews or photos;</li>
              <li>instructions or encouragement that a reasonable person would understand as unsafe on the water.</li>
            </ul>
            <p style={{ ...pStyle, marginTop: "0.75rem" }}>
              <strong>Reviews that name a private business.</strong> Many spots involve a private
              business: a marina, a paddle shop, a private dock. You may share honest opinion and an
              honest, accurate description of your own experience. Opinions are yours to make.
              <strong> False statements of fact presented as true are different</strong>, and they can
              expose both you and us to liability. The practical rule:{" "}
              <strong>write what you saw, not what you concluded.</strong> &ldquo;There was an oily
              sheen on the water by the dock on June 3&rdquo; is something you witnessed. &ldquo;This
              business dumps fuel in the water&rdquo; is a conclusion about someone else&rsquo;s
              conduct that you almost certainly cannot prove. You are solely responsible for the
              factual claims you make about third parties.
            </p>
            <p style={pStyle}>
              We may reject any submission for any reason or no reason, and we are under no
              obligation to publish or to explain a rejection.
            </p>
            <p style={pStyle}>
              <strong>Honest reviews of us are welcome.</strong> Nothing in these terms restricts or
              penalises your honest review or assessment of Paddle to Water itself, and we will not
              seek to enforce any provision as such a restriction.
            </p>
          </Section>

          <Section title="6. Moderation, and our role as a host">
            <p style={pStyle}>
              Every review is held for human review before it can appear. Nothing you submit is
              published automatically.
            </p>
            <p style={pStyle}>
              We act as a host and distributor of Content created by users, not as its author or
              publisher. Reviews reflect the views of the contributors who wrote them, not the views
              of Paddle to Water or its owner. Our decision to publish, reject, or later remove a
              review does not make us the author of that Content, and we do not adopt or endorse it.
              Any rating average shown on the Site is an automated calculation from
              contributor-supplied ratings. It is not our own statement about a spot or any business,
              and it is not a statement that a spot is safe.
            </p>
          </Section>

          <Section title="7. Copyright, DMCA, and reports about a published review">
            <p style={pStyle}>
              We respond to notices of claimed copyright infringement under the Digital Millennium
              Copyright Act, 17 U.S.C. 512. Designated agent: DMCA Agent, Paddle to Water,{" "}
              <a href="mailto:hello@paddletowater.com" style={linkStyle}>hello@paddletowater.com</a>.
              A mailing address for service is available on request. A notice must include your
              signature, identification of the work and of the material to be removed, your contact
              details, a good-faith statement, and a statement under penalty of perjury that you are
              the owner or authorised to act for them. Knowingly misrepresenting that material is
              infringing can make you liable for damages under 17 U.S.C. 512(f). If we remove your
              Content in response to a notice we will make a reasonable effort to notify you, and you
              may send a counter-notice.
            </p>
            <p style={pStyle}>
              Businesses or individuals who believe a published review contains false factual
              assertions or unlawful content may contact us at{" "}
              <a href="mailto:hello@paddletowater.com" style={linkStyle}>hello@paddletowater.com</a>.
              Please identify the specific review and the specific statement. We reserve the right,
              in our sole discretion, to temporarily unpublish content, to ask the contributor to
              verify a factual claim, to remove content, or to take no action at all. Providing this
              report path is a voluntary courtesy. It does not create any obligation to remove,
              review, or investigate any content, and it does not waive any protection available to
              us, including under 47 U.S.C. 230.
            </p>
            <p style={pStyle}>
              We terminate the contribution privileges of repeat infringers in appropriate
              circumstances.
            </p>
          </Section>

          <Section title="8. Indemnification">
            <p style={pStyle}>
              To the fullest extent permitted by law, you will indemnify, defend, and hold harmless
              Paddle to Water and its owner from any third-party claim, demand, loss, liability, or
              expense, including reasonable attorneys&rsquo; fees, arising out of or relating to your
              Content, your breach of these terms or your representations, or your violation of any
              law or third-party right in connection with your Content. This does not extend to any
              claim to the extent it arises from our own gross negligence, recklessness, or wilful
              misconduct, and does not apply to liability that cannot be shifted under applicable
              law.
            </p>
          </Section>

          <Section title="9. Privacy and personal data">
            <p style={pStyle}>
              To post a review you sign in, which means we process personal information: your
              identity-provider profile, your display name, your reviews, and technical and usage
              data. What we collect and why is described in our{" "}
              <Link href="/privacy" style={linkStyle}>Privacy Policy</Link>.
            </p>
            <p style={pStyle}>
              <strong>Your choices, offered to everyone.</strong> Rather than sorting users by state,
              we offer the same core choices to every US user. You can ask us what personal
              information we hold about you, ask for a copy, ask us to correct it, and ask us to
              delete your account and its data. We do not sell your personal information, and we do
              not share it for cross-context behavioural advertising. Email{" "}
              <a href="mailto:hello@paddletowater.com" style={linkStyle}>hello@paddletowater.com</a>{" "}
              from the address on your account. We respond within 45 days, and we will not charge or
              penalise you for asking.
            </p>
            <p style={pStyle}>
              <strong>What deletion actually does.</strong> If you ask us to delete your account, we
              remove your reviews from public display and dissociate them from your account and
              display name, we delete your account and your saved spots, and, if you ask us to delete
              everything, we also delete your email and push alert subscriptions. Residual copies may
              persist in routine backups for a limited period, and we retain the moderation and
              legal-defence records described above for up to three years. Those records are never
              publicly displayed.
            </p>
          </Section>

          <Section title="10. Disclaimers and limitation of liability">
            <p style={pStyle}>
              <strong>Reviews are opinions, not safety advice.</strong> They are the personal
              opinions and experiences of individual paddlers. They are not safety instruction,
              condition reports, or a guarantee that a spot is safe, legal to access, or suitable for
              you. This restates and does not narrow our{" "}
              <Link href="/disclaimer" style={linkStyle}>Disclaimer</Link> and{" "}
              <Link href="/terms" style={linkStyle}>Terms of Use and Release</Link>, including that
              all water activities carry inherent risk of serious injury or death and that you are
              solely responsible for assessing conditions, access rights, and your own fitness before
              launching. <strong>A favourable review, a high rating, or a high average never means a
              spot is safe.</strong> Conditions change, access changes, and the person who wrote a
              review is not you and was not there on your day.
            </p>
            <p style={{ ...pStyle, textTransform: "uppercase", fontSize: "0.8125rem" }}>
              Content and the review feature are provided &ldquo;as is&rdquo; and &ldquo;as
              available,&rdquo; without warranties of any kind, express or implied, including
              accuracy, title, non-infringement, merchantability, or fitness for a particular
              purpose, to the fullest extent permitted by law.
            </p>
            <p style={pStyle}>
              We do not verify the truth of reviews. We are not liable for reliance on any review,
              for a review&rsquo;s effect on any business, or for a dispute between a contributor and
              a reviewed business.
            </p>
            <p style={{ ...pStyle, textTransform: "uppercase", fontWeight: 600, fontSize: "0.8125rem" }}>
              To the fullest extent permitted by applicable law, Paddle to Water and its operator
              shall not be liable for any indirect, incidental, special, consequential, or punitive
              damages, or any loss of profits or data, arising out of or related to your submission
              of Content, any Content published on the Site, our moderation, rejection, or removal of
              Content, or any reliance on Content. In no event shall our aggregate liability for all
              such claims exceed one hundred U.S. dollars ($100.00). Some jurisdictions do not allow
              these exclusions; in such jurisdictions our liability shall be limited to the greatest
              extent permitted by law.
            </p>
            <p style={{ ...pStyle, textTransform: "uppercase", fontWeight: 600, fontSize: "0.8125rem" }}>
              Nothing in this section limits liability for gross negligence, recklessness, wilful
              misconduct, fraud, or any other liability that cannot be limited under applicable law,
              including any claim for personal injury or death to the extent applicable law does not
              permit it to be limited.
            </p>
            <p style={pStyle}>
              This limitation applies to Content-related claims. Claims arising out of your use of
              the Site generally are governed by the limitation of liability in the{" "}
              <Link href="/terms" style={linkStyle}>Terms of Use and Release</Link>. The one hundred
              dollar limit is a single aggregate limit across all of the Site&rsquo;s legal
              documents. It is not cumulative and does not stack.
            </p>
          </Section>

          <Section title="11. Changes and termination">
            <p style={pStyle}>
              We may change these terms and will post the changed version with an updated version
              number and date. For changes that materially affect your rights, including any change
              to indemnification, liability, or disputes, we will ask you to accept the new version
              by checking the acknowledgment box again before your next submission. Continued use of
              the Site alone is not acceptance of a material change. You are bound only by the
              version you actually accepted at the time you submitted Content.
            </p>
            <p style={pStyle}>
              We may suspend or terminate your ability to contribute at any time. The licence for
              already-published Content, and the representations, indemnity, liability, and disputes
              sections, survive termination.
            </p>
          </Section>

          <Section title="12. Governing law and disputes">
            <p style={pStyle}>
              These terms and any dispute arising out of or related to them are governed by the laws
              of the State of California, without regard to its conflict-of-law principles, except
              where the law of your home state provides you a protection that cannot be waived by
              agreement, in which case that protection applies to you. You agree to the exclusive
              jurisdiction and venue of the state and federal courts located in San Francisco County,
              California, except that either party may bring an individual action in a small-claims
              court of competent jurisdiction, either in San Francisco County or in the county where
              you reside.
            </p>
            <p style={{ ...pStyle, textTransform: "uppercase", fontWeight: 600, fontSize: "0.8125rem" }}>
              To the fullest extent permitted by law, you agree that any claim must be brought in
              your individual capacity and not as a plaintiff or class member in any purported class,
              collective, consolidated, or representative proceeding. If this paragraph is held
              unenforceable as to you or in your jurisdiction, only this paragraph is severed as to
              you or in that jurisdiction, and the rest of these terms remain in full force.
            </p>
            <p style={pStyle}>
              Nothing in these terms waives any right you may have to a trial by jury, and nothing
              shortens any limitations period that would otherwise apply to your claims. We have
              deliberately left both intact.
            </p>
            <p style={pStyle}>
              If any provision is held invalid or unenforceable, it will be enforced to the maximum
              extent permitted by law, and if it cannot be, it will be severed. The invalidity of a
              provision as to one user or in one jurisdiction does not affect its validity as to
              other users or elsewhere, or the validity of the rest of these terms.
            </p>
          </Section>

          <Section title="13. Contact">
            <p style={pStyle}>
              For any question about these Contributor Terms, for a privacy or deletion request, or
              to report a published review, contact us at{" "}
              <a href="mailto:hello@paddletowater.com" style={linkStyle}>hello@paddletowater.com</a>.
              For copyright notices and counter-notices, contact our designated agent: DMCA Agent,
              Paddle to Water, at the same address. A mailing address for service is available on
              request.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={h2Style}>{title}</h2>
      {children}
    </section>
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
  margin: "0 0 0.75rem",
};

const ulStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  lineHeight: 1.75,
  color: "var(--dark)",
  margin: 0,
  paddingLeft: "1.125rem",
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
};

const linkStyle: React.CSSProperties = {
  color: "var(--accent)",
  textDecoration: "underline",
};
