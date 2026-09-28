# Operations

> **Working draft.** This page describes how the work of Equity for Humanity is organized. It applies the principle set out in the [Administration and Stewardship Principles](../current/equity-for-humanity-administration-principles-v0.1.md): "Agents reduce the burden. Humans carry the responsibility."

## In brief

- The project is led by a founder, supported by a small number of volunteers and assisted by AI agents that do the bulk of the work, to keep costs down.
- AI agents prepare work. People approve it. Decisions on money, legal matters, and public commitments are always made by people.
- No AI agent moves money, signs documents, makes government filings, or publishes anything without approval.

## Roles

| Role | Responsibilities | Tools |
|---|---|---|
| **Founder** | Leads the project; approves work; signs documents; completes identity checks; opens accounts; records voice or video; makes final decisions until a board exists | Standard computer and phone |
| **Volunteers and advisors** | Review drafts in their areas of expertise; act as second approvers for financial matters and public commitments; serve as directors once the entity is incorporated | Same |
| **Coordinator agent** | Maintains the [status tracker](status.md) and GitHub Issues; divides work into tasks; assigns tasks to helper agents; prepares a queue of items for approval; writes a weekly summary | GitHub Issues and Projects; this repository |
| **Correspondence agent** | Sorts incoming email; drafts replies; flags important items | Project inbox, with drafting access only |
| **Website and application agent** | Prepares updates to the website and the prototype as pull requests | GitHub; GitHub Pages |
| **Research agent** | Verifies facts; monitors changes to rules and programs; updates these documents with sources | Web search |
| **Outreach agent** | Drafts correspondence and briefing notes; records replies | Templates in [partners](partners-and-outreach.md) |
| **Bookkeeping agent** (from Stage 2) | Prepares the public ledger from bank and brokerage statements; drafts financial reports | Read-only statement exports; a ledger file in the repository |
| **Media agent** | Prepares scripts, transcripts, captions, thumbnails, and draft posts | See [communications](communications.md) |

## Approval matrix

| Task | AI agents may do alone | Requires founder approval | Reserved to people |
|---|---|---|---|
| Research, fact-checking, and updating drafts in the repository | Yes | | |
| Preparing website or document changes as pull requests | Yes | Publishing to the live site | |
| Updating the status tracker and GitHub Issues | Yes | | |
| Sorting email and drafting replies | Yes | Sending any reply | |
| Routine replies using approved text | | Yes; may be approved in batches | |
| Correspondence with partners, funders, and media | Drafting | Sending | |
| Social media posts and videos | Drafting, editing, and preparing unpublished drafts | Publishing | |
| Speaking on camera or voice for the project | | | Yes |
| Use of an AI-generated voice or likeness of any person | | | Never without that person's written consent, and always disclosed |
| Grant applications | Drafting | Submitting | Signing any agreement |
| Incorporation and other government filings | Preparing forms and checklists | | Signing and filing |
| Opening bank or brokerage accounts; identity checks | Preparing checklists | | Yes |
| Moving money, paying invoices, or placing trades | | | Yes, with two approvers |
| Accepting a contribution or pledge | | | Yes, by board decision |
| Changes to the payout rule, investment policy, or privacy policy | Drafting options | | Yes, by board decision, consistent with the founding documents |
| Access to participants' personal data | | | Named individuals only; AI agents work with anonymized data |
| Public statements on legal status, tax, or returns | Drafting | Founder and one volunteer or advisor | |

## Financial safeguards

These safeguards take effect as soon as the project holds any funds. They are drafted now so that they are ready in advance.

1. **No autonomous money movement.** No AI agent has access to any account that can move money. Agents may receive read-only statements.
2. **Dual approval.** Every payment or trade requires two authorized people.
3. **Separation of duties.** The person who approves a payment is not the only person who records it.
4. **Public ledger.** Every amount received and spent is published at least monthly. Recipients' personal data is never published. Open Collective's transparent budgets are a reference model ([Open Collective, fiscal hosts](https://documentation.opencollective.com/fiscal-hosts/fiscal-hosts)).
5. **Separate buckets.** The Humanity Fund (Bucket A) and the Stewardship and Operations Reserve (Bucket B) are held in separate accounts and reported separately, as the Administration and Stewardship Principles require.
6. **Regulated partners for distributions.** The project will not operate its own wallet or payment system. See [legal structure](legal-structure-options.md).
7. **Access review.** All access rights are reviewed annually and whenever a person leaves a role.

## Safeguards for AI agents

AI systems that read email or web pages can be manipulated by instructions hidden in that content. This is known as prompt injection, and it is ranked first in the OWASP Top 10 for large language model applications ([OWASP Top 10 for LLM Applications 2025](https://genai.owasp.org/download/43299/)). The risk is greatest when a single agent combines access to private data, exposure to untrusted content, and the ability to send information externally, a combination the security researcher Simon Willison calls the "lethal trifecta" ([Willison, June 2025](https://simonwillison.net/2025/jun/16/the-lethal-trifecta/)).

The project applies the following rules:

- **The correspondence agent may read and draft email, but may not send it.** Sending always requires a person.
- **No agent that reads untrusted content also has access to credentials,** such as passwords, bank logins, or the private-beta access code.
- **Least privilege.** Each agent has only the access its task requires. Website changes are made through pull requests reviewed by a person.
- **Instructions found in emails, documents, or web pages are treated as information, not commands.** Any such request is flagged for review.
- **Traceability.** Agent changes to the repository are recorded in its history.
- **Separation from the private beta.** Agents working on public documents do not access the private-beta deployment or its configuration.

## Project inbox

- **Current arrangement:** the existing project inbox remains in use. A project address on the Equity for Humanity domain can forward to it; Cloudflare Email Routing offers this at no charge where the domain uses Cloudflare for DNS ([Cloudflare Email Routing](https://developers.cloudflare.com/email-routing/)) **[UNVERIFIED current DNS provider]**.
- **Google for Nonprofits:** in Canada this program requires a CRA registered charity number ([Google for Nonprofits, registration numbers](https://support.google.com/nonprofits/answer/12172927?hl=en_ph)). Because the core fund is planned as a non-charity structure, the project is not expected to be eligible.

## Weekly routine

1. **The coordinator agent publishes a weekly summary** as a GitHub issue, covering completed work, items awaiting approval, and blocked items.
2. **The founder reviews the approval queue** and approves, rejects, or returns each item with brief feedback.
3. **Agents act on the decisions** and update the [status tracker](status.md).
4. **If no review takes place in a given week,** agents continue drafting, but nothing is released.

## Bookkeeping

- **Stages 0 and 1:** the project holds no funds, so there is nothing to record. Costs that the founder or volunteers choose to cover personally are not project income.
- **Stage 2 onward:** a public ledger records the date, description, amount, bucket, category, and supporting document for each transaction. It is prepared from statements and approved monthly by the treasurer. Reporting categories follow the Administration and Stewardship Principles.
- **Later:** accounting software and, when required or advisable, a review by an external accountant.
