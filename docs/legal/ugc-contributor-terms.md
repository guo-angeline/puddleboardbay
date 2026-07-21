# UGC Contributor Terms

> **PROVENANCE AND HONESTY BLOCK. INTERNAL ONLY. DO NOT PUBLISH THIS SECTION.**
> Part 1 below is the publishable document. Everything above the Part 1 heading, and everything in Part 2, is internal repo record.

## Who wrote this, and who did not

This document was drafted by an **automated studio counsel agent**. It has **not been reviewed by a licensed attorney**. No attorney has read it, redlined it, or blessed it.

The project's decision record (D24 Q1) originally answered **"yes, engage an attorney."** On **July 21, 2026 the owner reversed that** and decided to publish without counsel review. Every `[ATTORNEY: ...]` bracket that previously sat in this file has therefore been **closed by the drafting agent's own best judgment**, not by a lawyer. Twenty-seven open questions were resolved that way.

**This is not legal advice and does not create an attorney-client relationship.** It is a risk-reduction artifact. It reflects an automated system's best defensible calls, and where a call depended on the current law of a specific state, it was resolved by drafting to the **most protective reasonable common denominator** rather than by guessing at any one state's rule. That approach reduces the chance of a clause being void somewhere. It does not make any clause certain to hold anywhere.

## Judgment calls made without counsel, and the residual risk the owner is knowingly carrying

**1. Standalone class-action waiver with no arbitration clause behind it (12.2).** In the common commercial design, it is the Federal Arbitration Act and its preemption of state-law hostility that makes a class waiver robust. The owner removed mandatory arbitration. The waiver in 12.2 therefore sits in a pure litigation clause **without that federal carrier**, and its enforceability against out-of-state consumers is genuinely uncertain. Some states are materially more hostile to class waivers in this posture. No state-by-state verification was done. Mitigation drafted: an explicit no-blow-up severance sentence inside 12.2 itself, so a court striking the waiver in one state is directed to strike only the waiver. Residual risk accepted: the waiver may simply not work in some states. Practical stakes today are low (free site, no money changing hands, no consumer-financial harm pattern, so no plausible class target).

**2. The $100 cap against a drowning and wrongful-death backdrop (10.4).** The cap is preserved as the owner directed, in all-caps, with the express unwaivable carve-out sentence (gross negligence, recklessness, willful misconduct, and anything else that cannot be limited). That carve-out is the single most important defensive addition, because a bare $100 cap with no visible carve-out is the clause a plaintiff attacks first, and an overreaching cap can taint how a court views the indemnity and the class waiver as a package. **Be clear about what drafting cannot do: no wording in this document closes the wrongful-death gap.** A wrongful-death claim generally belongs to the decedent's heirs as their own claim, and heirs are not parties to this contract. They never checked the box. A cap and a release the paddler agreed to may not bind them at all. That gap is answered with **an entity and insurance (D25 Q2 and Q3), not with words.** Those two items remain open. Until they close, the owner's personal assets are the backstop for a serious-injury or death claim connected to a listed spot.

**3. Three overlapping limitation-of-liability clauses. Decided, not asked.** The Site already publishes two live caps: `/terms` section 6 (a $100 aggregate cap on "all claims relating to the Site," supported by a release for ordinary negligence in section 5 that already carries a proper unwaivable carve-out) and `/disclaimer` (an uncapped "not responsible for any personal injury, property damage, fines, legal consequences, or other losses" plus an as-is line). The earlier draft of 10.4 reached "your use of the Site," which collided with both.

**What was done here:** 10.4 has been **narrowed to Content-related claims only** (submission, publication, moderation, removal, and reliance on Content). General site-use liability is left to `/terms` and `/disclaimer`. A non-cumulative sentence was added so the caps cannot be argued to stack, and 1.1 now states an explicit order of precedence. This is the lowest-collision option: it keeps each document doing one job, and it avoids binding the much larger general-audience population to a cap they never assented to.

**Redlines a future session should execute on the other two documents:**
- `/disclaimer`, "Limitation of liability": it is currently absolute and has **no** "to the fullest extent permitted by law" qualifier and **no** unwaivable carve-out. As written it reads as an attempt to disclaim liability for gross negligence, which is the kind of overreach that gets a whole clause read down. Add the qualifier and add the same carve-out sentence used in `/terms` section 5 and in 10.4 here. This is the weakest of the three clauses and the highest-value fix.
- `/terms` section 5: the release is expressed as limited to "California law." The Site is now nationwide. Change to "applicable law" so it does not read as inapplicable to an out-of-state user.
- `/terms` section 6: add one sentence stating the $100 cap is a single aggregate across all of the Site's legal documents and is not cumulative, mirroring 10.4 here.
- `/terms`: add a cross-reference to these Contributor Terms for anyone who submits a review.
- Neither `/terms` nor `/disclaimer` needs its cap amount changed. Both already say $100, so there is no numeric conflict to reconcile.

**4. The DMCA designated agent is NOT registered.** Section 7.1 now contains proper notice-and-counter-notice language and names `hello@paddletowater.com` as the agent contact. **Registering a designated agent with the U.S. Copyright Office is a real-world prerequisite that has not been done.** The DMCA safe harbor under 17 U.S.C. 512 **does not apply until that registration exists and is maintained** (the Copyright Office registration must also be renewed periodically). Nothing in Part 1 states or implies that the agent is registered. Until it is done, the Site is publishing a takedown procedure it will honor but is **not** protected by the safe harbor, which matters because Section 230 does **not** shield intellectual-property claims. Registration is cheap and online. Treat it as a hard prerequisite before the review feature is enabled.

**5. Defamation and anti-SLAPP exposure from hosting reviews of named out-of-state businesses.** This is the largest un-researched risk in the document. Section 230 is federal and should protect the Site as a **host** of third-party reviews in any state. What is **not** uniform is anti-SLAPP protection, which is the mechanism that gets a meritless speech suit dismissed early and, in the strongest states, shifts fees to the plaintiff. California's is strong. Other states range from modern uniform-act statutes, to narrow subject-matter statutes, to none at all. There is also a federal-circuit split on whether a state anti-SLAPP special motion is available in federal court. **None of this was verified.** The practical consequence: a marina or paddle shop in a weak-or-no-anti-SLAPP state can sue over a hosted review, and the Site can win and still be financially ruined by the cost of winning. Mitigations drafted into Part 1: prescriptive "write what you witnessed, not what you concluded" guidance in 5.2, an express ban on accusations of criminal or regulatory violations, contributor representations in Section 4, a narrowed but real indemnity in Section 8, pre-moderation, and the voluntary report path in 7.2 (which is the cheapest de-escalation tool the Site has). Understand clearly: **Section 12 binds contributors only.** A reviewed business suing over a hosted review is a stranger to this contract. The venue clause, the class waiver, and the cap do nothing against it.

**6. Published reviews and moderation records are not yet covered by the deletion runbook.** Sections 3.3, 9.2, and 9.3 now make concrete promises: on account deletion, the contributor's published reviews are removed from public display and dissociated from the account, while a moderation and legal-defense record is retained for up to three years. **`docs/legal/account-deletion-runbook.md` does not currently describe either step.** It covers `auth.users`, `user_saved_spots`, and the two non-cascading subscription tables, and nothing else. **The runbook must be extended to cover the reviews table and the moderation log before the review feature is enabled**, or 9.2 becomes a promise the owner cannot perform, which is an FTC Act Section 5 problem of exactly the kind that created that runbook in the first place. The three-year retention period was chosen as a defensible fit against typical defamation limitations periods. It was not verified state by state.

**7. Smaller calls made without counsel, listed so they are on the record.**
- **State minors and age-verification statutes (2.1):** resolved as a self-attested 18+ gate plus a COPPA-consistent under-13 posture. Several states have enacted minors' online-safety and age-verification laws, some in active litigation and some enjoined. Whether any reaches a free outdoor-recreation site with an 18+ review feature was **not** verified, and no statute is cited in Part 1 for that reason.
- **Indemnity (Section 8):** deliberately **narrowed** from the earlier broad version to third-party claims arising from Content, with an express exclusion for the Site's own gross negligence and willful misconduct. Reason: a broad consumer indemnity stacked on a $100 cap and a class waiver reads as unconscionable as a package, and that package impression is what puts the cap at risk. Deterrence value is retained; collection value against a consumer was always near zero.
- **Jury-trial waiver and limitations-shortening (12.3): deliberately omitted.** Pre-dispute jury-trial waivers are not enforceable in every state, and limitations-shortening varies by state and claim type. A clause that is void where it matters adds to the overreach picture without buying anything. 12.3 now says so affirmatively, which also improves the fairness optics of the whole dispute-resolution package.
- **Small-claims exception (12.1):** drafted as available **in the consumer's home county** as well as San Francisco. Strictly more favorable to the user, and materially improves how a court assesses an exclusive-venue clause against an out-of-state consumer.
- **California choice of law (12.1):** retained per owner directive. It may lose to a non-waivable consumer-protection statute or a forum-selection restriction in the contributor's home state. If it loses, that state's law may also govern the enforceability of the cap in 10.4. Not verified.
- **Privacy scope (Section 9):** retained as owner-directed, a single voluntary nationwide access-and-deletion promise with no state-by-state rights table. The premise, that a free pre-revenue solo site falls under the applicability thresholds of the state comprehensive privacy statutes, was **not verified**. The threshold-free obligations the section is scoped to (state breach notification, privacy-policy posting, COPPA, FTC Act Section 5) are believed correct but were also not verified.
- **The do-not-sell and do-not-share sentence in 9.2** depends on a factual check of the actual stack (PostHog on US cloud, plus any attribution or advertising pixel). If any of that meets a state definition of "sale," "sharing," or "targeted advertising," that sentence becomes untrue and therefore a Section 5 problem. **Confirm the stack before publishing.**
- **Contact address:** `hello@paddletowater.com`, which is already the alert reply-to and the privacy contact on the live legal pages. Operational risk: a legal complaint or a DMCA notice will land in the same inbox as feedback mail. Filter or label it.
- **Scope:** US only. No geo-blocking step is drafted. EU or UK users would change the analysis materially (GDPR and the ePrivacy cookie-consent regime) and would need counsel with EU competence.

## Implementation prerequisites before this document is published or the review feature is enabled

1. **Register the DMCA designated agent** with the U.S. Copyright Office. Until then, no safe harbor.
2. **Extend `docs/legal/account-deletion-runbook.md`** to cover published reviews and the moderation log, matching the promises in 3.3, 9.2, and 9.3.
3. **Build the assent UI to this spec.** A checkbox that is **unchecked by default**, immediately adjacent to and above the submit button, visible without scrolling, whose label reads exactly: *"I have read and agree to the Contributor Terms"* with "Contributor Terms" as a link inside the label opening the full text. Submission is blocked until checked. No pre-checking, no implied consent, no burying the link in a footer.
4. **Store proof of assent on every submission record:** UTC timestamp, account id, the terms version identifier (`v1.0`), and an archived copy or hash of the exact text displayed. The cap in 10.4 and the waiver in 12.2 bind only the version the contributor actually saw and checked.
5. **Ship the Privacy Policy user-content section in the same release** (D24 requirement). Section 9.1 points at it.
6. **Verify the do-not-sell and do-not-share sentence** against the live analytics and pixel stack.
7. **Placement:** a standalone page, cross-referenced from `/terms`, surfaced at the point of review submission. Not a fourth always-visible footer link, since this binds only the subset who post.
8. **Set the "Last updated" date in Part 1 to the actual publication date** if it is not July 21, 2026.
9. **Run the pre-enable deletion test** on a throwaway account, per the runbook, after step 2.

---

# Part 1: User-Generated Content Terms of Service

**Paddle to Water: Contributor Terms (User Reviews)**

**Version 1.0. Last updated: July 21, 2026.**

These Contributor Terms apply to everyone in the United States who submits a review to Paddle to Water.

## 1. What these terms cover and your acceptance

**1.1 Relationship to our other terms.** These Contributor Terms govern submitting reviews and other content to Paddle to Water. They are in addition to, and expressly incorporate by reference, the Site's Terms of Use and Release (at `/terms`), its Privacy Policy (at `/privacy`), and its Disclaimer (at `/disclaimer`). Those three documents are available at those addresses at all times, and you should read them before submitting Content. If these Contributor Terms conflict with any of those documents:

- for any claim arising out of your submission of Content, Content published on the Site, or our moderation of Content, these Contributor Terms control;
- for every other claim, the Terms of Use and Release controls;
- nothing in any of these documents narrows the safety disclaimers, the assumption of risk, or the release in the Terms of Use and Release and the Disclaimer, all of which continue to apply in full.

**1.2 How you accept.** You accept these Contributor Terms by checking the acknowledgment box shown before you submit any Content. The box is not checked for you. If you do not check it, your review is not submitted. If you do not agree to these terms, do not submit Content.

**1.3 If you do not agree.** You can still use the rest of the Site under its general Terms of Use and Release. Only the review feature requires these Contributor Terms.

## 2. Eligibility and account

**2.1 Age.** You must be at least 18 years old to submit a review. The review feature is offered only to adults. The Site is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If we learn that a contributor is under 18, we will disable their ability to contribute and remove their Content. If we learn that a user is under 13, we will delete the associated account data promptly, consistent with our Privacy Policy and applicable law. A parent or guardian who believes a child under 13 has provided us personal information may contact us at hello@paddletowater.com and we will delete it.

**2.2 Sign-in.** Posting requires signing in through a supported third-party identity provider (currently Google). You are responsible for activity under your signed-in account and for keeping your credentials secure. Authentication is handled by the identity provider under its own terms and privacy policy. We receive only the limited profile information described in our Privacy Policy.

**2.3 One account, one review.** One account per person. One review per launch spot per account. We may rate-limit, refuse, or remove submissions to prevent fraud, spam, or manipulation.

**2.4 Real experiences only.** Submit reviews only for spots you have genuine, first-hand experience with. Do not post fake reviews, reviews you were paid or rewarded for without disclosing it, or reviews written on behalf of a business. If you have any material connection to a spot or to a business named at a spot, including employment, ownership, a family relationship, free or discounted goods or services, or any other benefit, you must disclose that connection clearly in the review itself. We may reject any review that does not disclose a connection we are aware of.

## 3. The license you grant us

**3.1 You keep ownership.** You keep ownership of your Content. You grant us a non-exclusive, royalty-free, worldwide, sublicensable, transferable license to host, store, reproduce, display, publicly perform, distribute, and format your Content, and to create technical and display copies of it, for the purposes of operating, promoting, and improving the Site and its services across current and future platforms, including the website and the native mobile app.

**3.2 Formatting only. We do not rewrite your words.** The license to "format" your Content is limited to non-substantive technical presentation: layout, truncation for previews, character escaping, and safe rendering. It does not authorize us to rewrite, paraphrase, summarize as your words, or alter the substance of what you wrote. Our moderation is binary. We either publish your Content substantially as submitted, or we reject it in whole. We do not edit the substance of user text in place. If a submission would be publishable except for a discrete problem, such as a third party's phone number or a slur, we will reject it and invite you to resubmit a corrected version rather than silently changing your words.

**3.3 How long the license lasts, and what we keep.** The license continues for Content we have published for as long as it remains on the Site, and survives for backups, cached copies, and legal records for a commercially reasonable period after removal. For Content we reject or later remove, and for Content removed because you deleted your account, we may retain an archived copy and a record of the moderation decision for fraud prevention, dispute handling, and legal defense, for **up to three years** after the decision or removal, and longer only where a specific legal claim, demand, or proceeding is pending or reasonably anticipated. These retained records are not publicly displayed.

**3.4 Attribution and moral rights.** You waive any moral rights in your Content to the extent permitted by law, and you agree we are not required to attribute Content to you, though we may display your chosen display name.

## 4. Your representations and warranties

By submitting Content, you represent and warrant that:

**4.1** You own or have all rights necessary to submit the Content and to grant the license in Section 3.

**4.2** The Content is your genuine, truthful, first-hand opinion or experience, and any statement of fact in it is accurate to the best of your knowledge.

**4.3** The Content does not defame, libel, or slander any person or business; does not violate anyone's privacy, publicity, intellectual-property, or contractual rights; and is not otherwise unlawful.

**4.4** The Content is not fake, is not paid for without disclosure, and was not submitted in exchange for an undisclosed benefit, and you have disclosed any material connection to the spot or business you are reviewing, as required by Section 2.4.

**4.5** The Content contains no personal information about third parties (names, contact details, license plates, images of identifiable people) beyond what is reasonable to describe a public-facing business, and no confidential information.

## 5. Acceptable-use rules for reviews

**5.1 What not to post.** Reviews must be about the launch spot and your experience of it. Do not post:

- false statements of fact, or statements you present as fact that you cannot support;
- accusations that a person or business committed a crime, violated a law or regulation, or created a health or environmental hazard, unless you personally witnessed it and describe only what you personally witnessed;
- content that harasses, threatens, or targets a specific individual;
- hate speech, obscenity, or content sexualizing minors;
- personal or private information about identifiable individuals;
- spam, advertising, promotional links, or reviews written for or against a business you are connected to without the disclosure required by Section 2.4;
- content that infringes copyright or trademark, or that reproduces another site's reviews or photos;
- instructions or encouragement that a reasonable person would understand as unsafe on the water.

**5.2 Reviews that name a private business.** Many spots involve a private business: a marina, a paddle shop, a private dock. Those businesses are located all over the United States and they can and do take legal action over things written about them.

You may share honest opinion and an honest, accurate description of your own experience. Opinions are yours to make. "The staff were unfriendly," "I thought the parking fee was steep," "I would not go back" are opinions. **False statements of fact presented as true are different**, and they can expose both you and us to liability.

The practical rule: **write what you saw, not what you concluded.** "There was an oily sheen on the water by the dock on June 3" is something you witnessed. "This business dumps fuel in the water" is a conclusion about someone else's conduct that you almost certainly cannot prove, and it is exactly the kind of statement that starts a lawsuit. Keep factual claims to what you personally witnessed, at a specific place and time, and say so.

You are solely responsible for the factual claims you make about third parties. Section 8 explains what happens if a claim you made leads to a demand or a suit against us.

**5.3 Our discretion.** We may reject any submission for any reason or no reason, and we are under no obligation to publish, or to explain a rejection. Rejection is not a judgment about you. It reflects our editorial and legal discretion.

**5.4 Honest reviews of us are welcome.** Nothing in these terms restricts, penalizes, or requires you to give up any right in your honest review or assessment of Paddle to Water itself, and we will not seek to enforce any provision of these terms as such a restriction. Sections 5.1 and 5.3 concern content about **third parties** and about the lawfulness and relevance of submissions. They are not, and may not be read as, a contractual restriction on your ability to review us.

## 6. Moderation, and our role as a host

**6.1 Every review is reviewed by a human first.** Nothing you submit is published automatically. A submission is either published substantially as written, or rejected. We do not rewrite the substance of user submissions.

**6.2 We are a host, not the author.** We act as a host and distributor of Content created by users, not as its author or publisher. Reviews reflect the views of the contributors who wrote them, not the views of Paddle to Water or its owner. Our decision to publish, reject, or later remove a review does not make us the author or publisher of that Content, and we do not adopt or endorse it. Any numerical rating average or aggregate shown on the Site is an automated calculation from contributor-supplied ratings. It is not our own statement about a spot or about any business, and it is not a statement that a spot is safe.

**6.3 Removal.** We may remove or refuse any Content at any time, including after publication, without liability to you.

## 7. Copyright, DMCA, and reports about published reviews

**7.1 Copyright notices and counter-notices.** We respect intellectual-property rights and respond to notices of claimed copyright infringement under the Digital Millennium Copyright Act, 17 U.S.C. 512.

**Designated agent:** DMCA Agent, Paddle to Water, hello@paddletowater.com. A mailing address for service is available on request to that address.

**To submit a notice of claimed infringement**, send our designated agent a written communication that includes all of the following:

1. a physical or electronic signature of the copyright owner or a person authorized to act on the owner's behalf;
2. identification of the copyrighted work claimed to have been infringed, or a representative list if multiple works at one site are covered by a single notice;
3. identification of the material that is claimed to be infringing and that is to be removed, with information reasonably sufficient to let us locate it, such as the URL of the page;
4. your name, mailing address, telephone number, and email address;
5. a statement that you have a good faith belief that the use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law; and
6. a statement that the information in the notice is accurate, and, **under penalty of perjury**, that you are the copyright owner or are authorized to act on the owner's behalf.

Incomplete notices may be ineffective. Knowingly making a material misrepresentation that material is infringing can make you liable for damages, including costs and attorneys' fees, under 17 U.S.C. 512(f).

**Counter-notice.** If we remove your Content in response to a notice, we will make a reasonable effort to notify you. You may send our designated agent a counter-notice that includes all of the following:

1. your physical or electronic signature;
2. identification of the material that was removed and the location where it appeared before removal;
3. a statement **under penalty of perjury** that you have a good faith belief that the material was removed or disabled as a result of mistake or misidentification;
4. your name, mailing address, and telephone number; and
5. a statement that you consent to the jurisdiction of the United States District Court for the judicial district in which your address is located, or, if your address is outside the United States, for any judicial district in which we may be found, and that you will accept service of process from the person who submitted the notice or that person's agent.

If we receive a valid counter-notice, we will forward it to the person who submitted the original notice and may restore the removed Content in **not less than 10 and not more than 14 business days**, unless we first receive notice that that person has filed an action seeking a court order to restrain the allegedly infringing activity.

**7.2 Reports about a published review.** Businesses or individuals who believe a published review contains false factual assertions or unlawful content may contact us at **hello@paddletowater.com** to request review. Please identify the specific review, the specific statement you say is false or unlawful, and why. We reserve the right, in our sole discretion, to temporarily unpublish content, to ask the contributor to verify a factual claim, to remove content, or to take no action at all.

Providing this report path is a **voluntary courtesy**. It does not create any obligation to remove, review, respond to, or investigate any content, it does not create any duty to you, and it does not waive any protection available to us, including under 47 U.S.C. 230. We do not commit to any response time. We may decline reports without explanation.

**7.3 Repeat infringers.** We will terminate the contribution privileges of contributors who are repeat infringers of intellectual-property rights, in appropriate circumstances and at our discretion.

## 8. Indemnification

**8.1** To the fullest extent permitted by law, you will indemnify, defend, and hold harmless Paddle to Water and its owner from any third-party claim, demand, loss, liability, or expense, including reasonable attorneys' fees, that arises out of or relates to: your Content; your breach of these terms or of your representations in Section 4; or your violation of any law or third-party right in connection with your Content, including any defamation, privacy, publicity, or intellectual-property claim brought by a person or business you reviewed.

**8.2** This obligation does not extend to any claim to the extent it arises from our own gross negligence, recklessness, or willful misconduct, and it does not apply to any liability that cannot be shifted under applicable law. We will notify you of any claim for which we seek indemnity, and you may participate in the defense at your own expense. We will not settle a claim in a way that imposes a non-monetary obligation on you without your consent, which you will not unreasonably withhold.

## 9. Privacy and personal data

**9.1 What we process.** To post a review you sign in, which means we process personal information: your identity-provider profile, your display name, your reviews, and technical and usage data. What we collect, why, and the choices you have are described in our Privacy Policy, which includes a dedicated user-content section.

**9.2 Your choices, offered to everyone.** Rather than sorting users by state, we offer the same core choices to every US user. You can ask us what personal information we hold about you, ask for a copy of it, ask us to correct it, and ask us to delete your account and its data. **We do not sell your personal information, and we do not share it for cross-context behavioral advertising.**

To make a request, email **hello@paddletowater.com** from the email address on your account, so we can confirm the request is really yours. We will respond as promptly as we reasonably can, and in any event within 45 days. If a request is unusually complex we may take longer and will tell you why. We will not charge you or penalize you for making a request.

**9.3 What deletion actually does.** If you ask us to delete your account, we remove your reviews from public display and dissociate them from your account and display name, we delete your account and your saved spots, and, if you ask us to delete everything, we also delete your email and push alert subscriptions so we stop contacting you. Residual copies may persist in routine backups for a limited period, and we retain the moderation and legal-defense records described in Section 3.3 for up to three years. Those records are never publicly displayed. We will tell you what was deleted and what, if anything, was intentionally kept.

**9.4 Security incidents.** We take reasonable measures to protect personal information. If personal information we hold is subject to a security incident, we will notify affected users and any authorities as and when required by applicable law, including state breach-notification law in the state where an affected person resides.

## 10. Disclaimers and limitation of liability

**10.1 Reviews are opinions, not safety advice.** Reviews are the personal opinions and experiences of individual paddlers. They are **not** safety instruction, condition reports, or a guarantee that a spot is safe, legal to access, or suitable for you. This restates and does not narrow the Site's Disclaimer and its Terms of Use and Release, including that paddleboarding, kayaking, and all water activities carry inherent risk of serious injury or death, that the Site does not provide safety guidance, and that you are solely responsible for assessing conditions, access rights, and your own fitness for an activity before launching. **A favorable review, a high rating, or a high aggregate score never means a spot is safe.** Conditions change, access changes, and the person who wrote a review is not you and was not there on your day.

**10.2 As-is.** CONTENT AND THE REVIEW FEATURE ARE PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING ANY WARRANTY OF ACCURACY, COMPLETENESS, TITLE, NON-INFRINGEMENT, MERCHANTABILITY, OR FITNESS FOR A PARTICULAR PURPOSE, TO THE FULLEST EXTENT PERMITTED BY LAW.

**10.3 We are not responsible for user content.** We do not verify the truth of reviews. We are not liable for reliance on any review, for a review's effect on any business, or for a dispute between a contributor and a reviewed business.

**10.4 LIMITATION OF LIABILITY FOR CONTENT-RELATED CLAIMS.** TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, PADDLE TO WATER AND ITS OPERATOR SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR DATA, ARISING OUT OF OR RELATED TO YOUR SUBMISSION OF CONTENT, ANY CONTENT PUBLISHED ON THE SITE, OUR MODERATION, REJECTION, OR REMOVAL OF CONTENT, OR ANY RELIANCE ON CONTENT. IN NO EVENT SHALL OUR AGGREGATE LIABILITY FOR ALL SUCH CLAIMS EXCEED ONE HUNDRED U.S. DOLLARS ($100.00).

SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF CERTAIN DAMAGES. IN SUCH JURISDICTIONS, OUR LIABILITY SHALL BE LIMITED TO THE GREATEST EXTENT PERMITTED BY LAW.

**NOTHING IN THIS SECTION LIMITS LIABILITY FOR GROSS NEGLIGENCE, RECKLESSNESS, WILLFUL MISCONDUCT, FRAUD, OR ANY OTHER LIABILITY THAT CANNOT BE LIMITED UNDER APPLICABLE LAW, INCLUDING ANY CLAIM FOR PERSONAL INJURY OR DEATH TO THE EXTENT APPLICABLE LAW DOES NOT PERMIT IT TO BE LIMITED.**

This Section 10.4 applies to Content-related claims. Claims arising out of your use of the Site generally are governed by the limitation of liability in the Terms of Use and Release. **The one hundred dollar limit is a single aggregate limit across all of the Site's legal documents. It is not cumulative and does not stack.**

**10.5** Nothing in these terms limits or excludes any liability that cannot be limited or excluded under applicable law.

## 11. Term, changes, and termination

**11.1 Changes.** We may change these terms. We will post the changed terms with an updated version number and date. For changes that materially affect your rights or obligations, including any change to Section 8, Section 10, or Section 12, **we will ask you to accept the new version by checking the acknowledgment box again before your next submission.** Continued use of the Site alone is not acceptance of a material change. We record which version you accepted, and you are bound only by the version you actually accepted at the time you submitted Content.

**11.2 Termination.** We may suspend or terminate your ability to contribute at any time. The license in Section 3 for already-published Content, and Sections 3, 4, 8, 9, 10, 12, and 13, survive termination.

## 12. Governing law and disputes

**12.1 Governing law and venue.** These terms and any dispute arising out of or related to them are governed by the laws of the State of California, without regard to its conflict-of-law principles, except where the law of your home state provides you a protection that cannot be waived by agreement, in which case that protection applies to you. You agree to submit to the exclusive personal jurisdiction and venue of the state and federal courts located in San Francisco County, California, **except** that either party may bring an individual action in a small-claims court of competent jurisdiction, either in San Francisco County or in the county where you reside.

**12.2 CLASS ACTION WAIVER.** TO THE FULLEST EXTENT PERMITTED BY LAW, YOU AGREE THAT ANY CLAIM MUST BE BROUGHT IN YOUR INDIVIDUAL CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, CONSOLIDATED, OR REPRESENTATIVE PROCEEDING. If this Section 12.2 is held unenforceable as to you or in your jurisdiction, **only this Section 12.2** is severed as to you or in that jurisdiction. The rest of Section 12 and the rest of these terms remain in full force, and no other provision is affected.

**12.3 Jury trial and limitations periods.** Nothing in these terms waives any right you may have to a trial by jury, and nothing in these terms shortens any limitations period that would otherwise apply to your claims. We have deliberately left both intact.

**12.4 Severability and reformation.** If any provision of these terms is held invalid or unenforceable, that provision will be enforced to the maximum extent permitted by law, and if it cannot be, it will be severed. The remaining provisions continue in full force and effect. The invalidity or unenforceability of a provision as to one user or in one jurisdiction does not affect the validity of that provision as to other users or in other jurisdictions, or the validity of the rest of these terms.

## 13. Miscellaneous

**13.1 General.** These Contributor Terms, together with the Terms of Use and Release, the Privacy Policy, and the Disclaimer incorporated in Section 1.1, are the entire agreement between you and us about submitting Content, and supersede any prior understanding on that subject. Our failure to enforce any provision is not a waiver of it. We may assign these terms, including in connection with a sale or transfer of the Site. You may not assign them. There are no third-party beneficiaries. Headings are for convenience only. Severability is governed by Section 12.4.

**13.2 Contact.** For any question about these Contributor Terms, for a privacy or deletion request under Section 9.2, or to report a published review under Section 7.2, contact us at **hello@paddletowater.com**.

For notices of claimed copyright infringement and counter-notices under Section 7.1, contact our designated agent: **DMCA Agent, Paddle to Water, hello@paddletowater.com.** A mailing address for service is available on request.

---

# Part 2: Open risks the owner is carrying

*(Internal. Not part of the published terms.)*

No lawyer read this. That is a choice, and it is a reasonable one for a free, pre-revenue, solo project. Here is what that choice costs, in plain terms.

**1. If someone drowns at a listed spot, the $100 cap probably will not save you.** The cap and the release cover ordinary negligence. They do not cover gross negligence, and a wrongful-death claim belongs to the family, who never agreed to anything. **No wording fixes this.** The fix is an LLC (so the claim hits the company, not your house and savings) and a liability insurance policy. Both are still open as D25 Q2 and Q3. This is the single biggest exposure in the whole project, and it has nothing to do with reviews.

**2. If a marina sues you over a review someone else wrote, none of Section 12 helps.** The venue clause, the class waiver, and the cap bind contributors. A business you never had a contract with is not covered by any of it. Federal law (Section 230) should mean you win. Winning still costs money, and how fast and cheaply you can get out depends on the anti-SLAPP law of the state where the business sits, which varies from very strong to nonexistent. **Your cheapest defense is the report path in 7.2: answer politely, take it seriously, unpublish if the complaint has any merit.** De-escalation is much cheaper than being right in court.

**3. The DMCA safe harbor is not yours yet.** The takedown language in 7.1 is correct, but the agent is not registered with the Copyright Office. Until you register, a copyright claim over a photo or a copied review does not get the safe-harbor shield, and Section 230 does not cover copyright. Registration is a cheap online form. Do it before enabling reviews.

**4. The class-action waiver may not be enforceable.** You removed arbitration, which was the right call on cost, but it also removed the federal law that normally makes class waivers stick. In practice this matters very little today: there is nothing here to bring a class action about. It could matter later if the Site ever charges money or handles more sensitive data.

**5. Your deletion promise is currently wider than your runbook.** Section 9.2 and 9.3 promise things about published reviews and moderation records that `account-deletion-runbook.md` does not yet tell you how to do. A promise you cannot perform is worse than a narrower promise. Update the runbook before enabling reviews.

**6. Three legal documents now talk about liability.** This one has been narrowed so it only covers review-related claims, which keeps it from colliding with `/terms` and `/disclaimer`. `/disclaimer` still has the weakest clause of the three: it disclaims everything with no "to the fullest extent permitted by law" and no carve-out for gross negligence. Fix that when convenient. The specific redlines are listed in the provenance block above.

**7. Some things simply were not researched.** State minors and age-verification laws. Whether California choice of law survives against another state's consumer statute. Whether the state privacy laws' thresholds really do exclude you. The three-year retention period. Each was resolved by drafting conservatively rather than by looking up a rule. Conservative drafting lowers the odds of being wrong. It does not eliminate them.

## Revisit counsel if any of these happen

Stop and pay a real lawyer if:

- **A demand letter, cease-and-desist, or lawsuit arrives.** Any of them, from anyone, about anything. Do not answer it yourself. Do not delete anything before getting advice.
- **A business complaint escalates**, meaning they come back after your first response, mention a lawyer, or threaten a claim rather than just asking for a correction.
- **Anyone is seriously injured or dies** in circumstances connected to a spot listed on the Site, whether or not anyone has blamed you. Call a lawyer and your insurer the same week.
- **You form an entity or buy insurance** (D25 Q2 and Q3). Have counsel confirm the terms actually run to the entity and that the release and cap name the right party.
- **You start taking money**: PaddlePass, ads, affiliate links, sponsorships, anything. Revenue changes the consumer-protection analysis, the auto-renewal rules if it is a subscription, and the applicability thresholds of the privacy statutes.
- **Traffic or user count grows meaningfully.** The state comprehensive privacy laws turn on consumer counts. If the Site is holding personal information on tens of thousands of people, Section 9 needs a real look. Set a calendar check when you cross 10,000 signed-in accounts.
- **You collect anything more sensitive**: precise location history tied to an account, photos of identifiable people, payment details, or anything about a user under 18.
- **You add editorial voice on top of user content**: an owner's "our take," an AI-generated summary of reviews, or curated best-of lists that read as your own factual claims. That is the move most likely to turn you from a protected host into a co-author, and it would forfeit the strongest protection you have.
- **You get any EU or UK traffic you actually want to serve.** GDPR and the cookie-consent rules are a different world and need counsel with EU competence.
- **A regulator, a platform, or law enforcement contacts you.** Including a subpoena for a contributor's identity, which is a situation with real procedural rules and should not be handled by instinct.

---

**Disclaimer:** This is a risk assessment produced by an automated system to inform the owner's decision. It is not legal advice, it does not create an attorney-client relationship, and it is not a substitute for a licensed attorney in the relevant jurisdiction. No licensed attorney reviewed this document. Statements in it about how individual states treat releases, class-action waivers, forum-selection clauses, anti-SLAPP motions, minors' online-safety laws, retention periods, and privacy thresholds are the drafting agent's unverified working assumptions, not settled law. The owner is publishing it with knowledge of that.
