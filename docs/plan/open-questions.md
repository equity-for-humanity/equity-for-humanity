# Open questions and decisions log

> **Working draft.** This page records decisions made, decisions still open, and gaps nobody has solved yet. Agents add new questions as they come up; the founder and co-stewards close them.

## Decisions log

| Date | Decision | Why | Who |
|---|---|---|---|
| 2026-09 | E4H accepts **no money** until a legal home and safeguards exist. | Trust, legal safety, and founder protection. | Founder (existing policy, restated) |
| 2026-09 | Publish the next-stage plan openly, as a working draft. | Invite critique; show honesty about limits. | Founder approval pending (this pull request) |
| 2026-09 | Payouts, if any, will go through regulated partners; E4H will not build its own wallet or payment rail. | Money-transmission rules and fraud risk. | Proposed; needs founder approval |
| Open | **Path A** (own non-profit, then charity) or **Path B** (pilot inside a partner such as Windfall Trust). | See [legal options](legal-structure-options.md). | Founder with co-stewards, Stage 1 |
| Open | Quebec OBNL or federal CNCA, if Path A. | Cost is similar; language and registry differ. | Stage 1 |
| Open | Which global ETF for a first fund (VT held directly versus a Canadian ETF). | Tax effect after the August 2026 US court ruling. See [investing](investing.md). | Stage 2, with an accountant |

## Biggest unknowns

1. **Can universal payouts ever fit a charity?** Canadian and US charity law require beneficiaries to be in need. E4H's "universal by right" idea may need government, multilateral, or non-charitable routes. What would a lawyer say about a design where anyone can claim but only people below a threshold receive cash, and everyone else's share recycles?
2. **Does the dynamic payout rule fit the 3.5% minimum spending rule?** The rule pays 0% when average growth is zero or negative. A charity must still spend 3.5% of investment assets each year (5% above $1 million). Options: a payout floor, counting other charitable spending, or carrying past excess spending forward.
3. **Can a non-profit hold a growing investment fund?** CRA warns that aggressively pursuing investment income or large surpluses can show a profit purpose. This matters if E4H stays a non-profit without charity status.
4. **Are payouts taxable for recipients?** Unknown for Canada and for other countries. Needs a written opinion before any payout.
5. **Does the website need to be in French?** Quebec's Charter of the French Language, as amended in 2022, requires commercial documents made available to the public by Quebec businesses, including websites and social media, to be available in French on terms at least as favourable ([OQLF presentation on the amended law](https://www.oqlf.gouv.qc.ca/rdiprp/demandes/AI2223-167_documents/AI2223_167_presentation.pdf); [OQLF social media guide](https://www.oqlf.gouv.qc.ca/francisation/entreprises/guide-medias-sociaux.pdf)). Whether a non-commercial, pre-launch project is covered is **[UNCERTAIN]**. Recommended regardless: publish French versions of key pages.
6. **Does the word "equity" or "ownership" create a securities-law problem?** If participants are told they "own" a share of the fund, a regulator might see an investment. The brand can stay; the product wording should say "benefit" or "share of returns" and be reviewed by a lawyer.
7. **How does E4H relate to Windfall Trust?** Partner, contributor, local chapter, or separate project? This is the most important strategic question for Stage 1.

## Gaps not yet solved

### Identity and "one human, one claim" (sybil resistance)

- **The problem:** without verification, one person can claim many times with fake accounts. With heavy verification, people without ID or smartphones are excluded, and sensitive data is created.
- **What we learned:** GoodDollar uses face scans, yet a partner project reported coordinated fake accounts in January 2026, likely by paying people in need to verify for someone else ([GoodDollar forum](https://discourse.gooddollar.org/t/cogov-weeks-7-9-infrastructure-mechanisms/8738)). World ID offers strong uniqueness with privacy protections but limited Orb access and regulatory pushback in some countries (see [partners](partners-and-outreach.md)). GiveDirectly relies on local enrolment and mobile-money checks ([2024 risk report](https://www.givedirectly.org/risk-report-2024)).
- **Direction:** support more than one method; start pilots through partners who already verify recipients; never make one company the only gate.

### Fairness of distribution rules

- Equal per person? Weighted toward the poorest? Children counted? What happens when there are more claimants than money? These choices are political and ethical, not just technical.
- **Direction:** publish options and invite public comment before deciding. Start where need is greatest, in line with charity law and with Windfall Trust's stated approach.

### Governance

- Today one volunteer makes all decisions. That is fine for a concept, not for a fund.
- **Direction:** at least three directors before money; conflict-of-interest and compensation policies; the founder recuses from any decision about their own pay (already promised in the administration principles).

### Transparency reporting

- **Direction:** public ledger from the first dollar; quarterly holdings; yearly report on costs by category, payouts, fraud losses, and take-up. Norway's fund publishes every holding and is a good model ([NBIM all investments](https://www.nbim.no/en/investments/all-investments/)).

### Market downturns

- Stock markets can fall 30 to 50%. A fund that promises steady payouts can be forced to sell low.
- **Direction:** the dynamic rule and a multi-year average already help; Alaska uses a similar average over five of the past six years, capped at 5% ([APFC](https://apfc.org/the-fund/)). Keep a year of payouts in cash. Say clearly that payouts can fall to zero.

### Tax receipts

- Only a registered charity can issue official Canadian tax receipts. Until then, E4H should not suggest gifts are deductible.

### Cross-border donors

- Canadian donors cannot usually deduct gifts to US charities, and US donors cannot usually deduct gifts to Canadian charities, except against income from the other country ([IRS summary of the treaty rule](https://www.irs.gov/pub/irs-tege/eotopicc01.pdf)). Intermediaries exist (for example Myriad Canada, formerly KBF Canada) but add cost.
- **Direction:** Canada first; a US "friends of" charity only when justified.

### Accessibility

- Website and app should meet WCAG 2.2 AA where practical: captions, contrast, keyboard use, plain language, and French. People without smartphones need an offline or assisted path (connectors).

### Credibility

- Common red flags donors look for: no legal entity, no board, no financial statements, vague promises, one-person control. E4H should name these openly and show the plan to fix each one.

### Impact measurement

- What counts as success? Money delivered per dollar of cost, take-up among the poorest, recipient well-being, fund growth above contributions, fraud losses.
- **Direction:** agree metrics before the pilot starts; publish results even when they disappoint, as OpenResearch did ([OpenResearch findings](https://www.openresearchlab.org/projects/unconditional-cash-study)).

## Facts in this plan that still need checking

- Exact Quebec registration fee for a federal non-profit, and the minimum number of applicants for a Quebec OBNL.
- Revenu Québec filing requirements for registered charities.
- Whether Questrade Custom Indexing is available to corporate accounts.
- Trump account platform providers (BNY, Robinhood) and the minimum charitable contribution per child.
- The list of countries where World's operations were restricted.
- Contact routes for several partners (marked in [partners](partners-and-outreach.md)).
- The current DNS host for equityforhumanity.org (needed for free email forwarding).
- Myriad Canada fees and minimums.
