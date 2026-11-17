# MASTER EXECUTION PROMPT: BUD & THINGS by Ashi

## Complete business, product, software, technical, operational and governance documentation

| Field | Value |
|---|---|
| Document ID | BNT-GOV-001 |
| Version | 1.1 (corrected from the owner's draft v1.0) |
| Status | Draft. Pending owner review. Not approved |
| Project ID | BNT |
| Baseline | BNT-DOC-BASELINE-001, candidate version 1.0 |
| Candidate date | 16-11-2026. The approval date is [TBD] and is set only when the owner approves |
| Business | BUD & THINGS by Ashi |
| Website | https://budandthings.com/ |
| Repository | `abhiyknp/Claude-Projects`. The site and app are in `bud-and-things/`. The documentation root is `docs/` at the repository root |
| Prepared by | Claude, from the owner's draft v1.0 and the repository as it stands on 16-11-2026 |
| Reviewed by | [TBD] |

---

## 0. What was corrected from v1.0, and why

Every row below was checked against the repository or an owner statement. Nothing was changed without a reason. Rows marked **Owner decision** are not resolved here; the executing agent must record them in the Open Questions Register and must not choose for the owner.

| # | v1.0 said | Corrected to | Evidence |
|---|---|---|---|
| E-01 | Proprietor: Ashi | Legal name **Shivani Yadav**. Display name **By Ashi**. The brand name is "BUD & THINGS by Ashi" | Owner statement, 16-11-2026; `audit/BRIEF_FACTS.md` |
| E-02 | Brand colours: Ivory, Sand, Terracotta, Olive, Chocolate, Brass | The live primary theme is **Silk, Maroon & Gold**: maroon #8F1834, dark maroon #7A1229, gold #D6A34A, cream #F8F0E4, ink #150206. The design system v2.0 tokens hold the other palette (ivory #F8F0E4, sand #EAD8C6, terracotta #A55B3F, olive #6B705C, sage #9A9F85, chocolate #3D281E, gold #C9A96A), which the site offers as the switchable "Signature" theme. **Owner decision:** which palette is the approved brand palette | `audit/BRIEF_FACTS.md`; `bud-and-things/system/tokens/bud-and-things.tokens.css`; `SKINS` in `prototype/index.html` |
| E-03 | Payment gateway not live; Cashfree and PayU onboarding | The code integrates **Razorpay** (`supabase/functions/pay`). Cashfree and PayU are not used in code. The owner reported a live payment, webhook and refund test on 03-11-2026 (not verified by Claude). The shop is not open to the public (Coming soon page on, online payment switch off by default) | `supabase/functions/pay/index.ts`; `audit/BRIEF_FACTS.md`; `audit/28_CLOSEOUT_STATUS.md` |
| E-04 | Hosted on GitHub Pages | GitHub Pages **behind Cloudflare** (DNS, SSL, response-header rules; owner-reported, headers checked by curl on 03-11-2026). Data and sign-in are on **Supabase**. Photos are on **Cloudinary**. Email is **Resend**. Couriers are **Shiprocket** | `.github/workflows/pages.yml`; `bud-and-things/README.md`; `audit/11_INFRASTRUCTURE_AUDIT.md` |
| E-05 | Document ID for the PRD is BNT-PRD-001 | That prefix collides with the product ID convention `BNT-PRD-<CODE>-<NNN>` (for example BNT-PRD-CG-001). Until the owner decides, the PRD document uses **BNT-PRQ-001**. **Owner decision** | `bud-and-things/prototype/import.js`; `data/catalogue.sheet.json` |
| E-06 | Product examples include Sun Muse and Berry Swirl, and "soy wax" | **Sun Muse** and **Berry Swirl** are not in the product sheet snapshot (`data/catalogue.sheet.json`). Iced Latte (BNT-PRD-CG-001), Vanilla Gold (CG-002), Strawberry Cream (CG-004) and Cocoa Bites (CG-005) are. The sheet has no wax, wick, vessel, fragrance quantity, bill of materials or cost fields, so "soy wax" is **unverified** | `data/catalogue.sheet.json` (32 items) |
| E-07 | Product types: soy, sculptural, glass, decorative, gift, seasonal, customised candles | The sheet's types are Glass candle (6), Murphy candle (4), Jar candle (1), Moulded candle (9), Tealight candle (6), **Jesmonite tray (2), Jesmonite dish (3) and a DIY Paint Kit (1)**. Jesmonite objects were missing from v1.0 | `data/catalogue.sheet.json` |
| E-08 | Frameworks, package manifests, a backend framework and REST APIs are assumed | There is **no framework and no `package.json`**. The site is one HTML file with plain JavaScript (`prototype/index.html`, plus `db.js`, `import.js`, `invoice.js`, `room3d.js`, `products3d.js`). The backend is Supabase Postgres (26 tables defined in `schema.sql`, where older audit notes say 25, to be reconciled; row-level security; 52 SQL functions) and three Edge Functions (`pay`, `delivery`, `notify`). There is no hand-written REST server. OpenAPI is therefore limited to the three Edge Functions plus a catalogue of the database RPC functions | `bud-and-things/supabase/schema.sql`; `supabase/functions/` |
| E-09 | `docs/` is the root and existing documentation may be overwritten | `docs/` does not exist yet. **56 Markdown files already exist** (for example `audit/` with 37 files, `bud-and-things/README.md`, `WORKFLOW.md`, `supabase/README.md`, `system/README.md`, `tasks/`). They are inputs to be linked and reused, never overwritten | Repository listing, 16-11-2026 |
| E-10 | Udyam registered; Amazon seller account registered; Shiprocket configured | Not verifiable from the repository. Shiprocket has code (`delivery` function) but a live courier label test is still open. There is **no Amazon integration in code** (only marketplace price and barcode fields in the sheet import). Udyam: `audit/17` records it as unconfirmed. Treat all three as **owner-stated, unverified** | `audit/28_CLOSEOUT_STATUS.md`; `audit/17_INDIA_COMPLIANCE_AUDIT.md` |
| E-11 | Typography is not specified | The README decisions table says Cormorant Garamond and Lato. The site's CSS uses **Playfair Display and Montserrat**. They disagree. **Owner decision** | `bud-and-things/README.md`; `prototype/index.html` (`--display`, `@font-face`) |
| E-12 | Baseline date 16 November 2026 | 16-11-2026 is the **candidate** creation date. An approved baseline has no date until the owner approves | Section 20 of v1.0, "do not mark approved without approval" |
| E-13 | "100% correct" documentation | Not achievable for facts nobody has verified. The standard is: every statement is **Verified** (file path or log cited), **Owner-stated** (date cited) or **[TBD]**. Legal, tax and compliance matters are flagged for professional review. The owner decided on 16-11-2026 that a CA is not needed for now; the compliance register records that decision and does not imply the advice was taken | Owner statement, 16-11-2026 |
| E-14 | Nearly 230 documents, "no placeholders" | Many documents have no verified source data yet (bill of materials, costing, burn tests, suppliers, campaign results). They must still exist as real files with a purpose, the verified current state, the data fields to capture, who holds the data and a status of Pending Validation. They contain **no invented values**. This reconciles rules 5 and 19 | Section 3 |

**Known facts the executing agent must start from** (all in the repository):

- The shop is in Coming soon mode. The audit decision is NOT READY (`audit/28_CLOSEOUT_STATUS.md`); the current task list is `bud-and-things/tasks/LAUNCH_CHECKLIST.md`.
- GST: not registered. The GST switch is off and invoices are bills of supply.
- Public contacts on the site: grievance officer and consumer care Abhishek Yadav, hello@budandthings.com. Phone numbers and the postal address are not copied into `docs/`.
- Product ID codes in use: CG, DIY, JT, MC and TL.
- Automated checks: 13 test suites (`bud-and-things/tools/test-*`), the 13-page audit (`audit.js`), `check-syntax.js` and `scan-secrets.js`, run by `.github/workflows/audit.yml`.
- Workflows: `pages.yml` (publishes the site; its paths do not include `docs/`, so documentation changes do not redeploy the site), `audit.yml`, `uptime.yml`, `vendor-advisories.yml`, and Dependabot.
- The database and the Edge Functions are deployed by hand. `bud-and-things/supabase/DEPLOYED_STATE.md` records what is and is not deployed.

---

## 1. Your role and responsibility

Act as one multidisciplinary team: senior business analyst, product manager, product owner, business, solution and software architect, technical lead, full-stack developer, database architect, UI/UX designer, QA manager, test engineer, cybersecurity specialist, DevOps engineer, e-commerce consultant, business operations consultant, manufacturing process consultant, legal and compliance research analyst, digital marketing strategist, technical documentation specialist, and project governance and configuration manager.

Your task is to establish a complete, interconnected, maintainable documentation ecosystem for BUD & THINGS, and to govern it.

**This is a documentation and governance assignment. It is not a request to rebuild or change the website.** The only paths you may create or change are under `docs/`. Application source, workflows, the database schema and the Edge Functions are read-only.

The documentation becomes the authoritative reference for future business, product, requirements, website, software, architecture, UI/UX, database, API, testing, deployment, security, compliance, manufacturing, operations and expansion decisions.

---

## 2. Project background and business context

Use the corrected facts in section 0. Verify every statement below against the repository and current business records. Historical information is not proof of current status.

### 2.1 Business identity

| Item | Value | Status |
|---|---|---|
| Business name | BUD & THINGS by Ashi (display name: By Ashi) | Verified (site) |
| Tagline | Made with thought. Given with feeling. | Verified (site) |
| Structure | Sole proprietorship | Owner-stated |
| Proprietor (legal name) | Shivani Yadav | Owner-stated, 16-11-2026 |
| Category | Handmade candles, Jesmonite home objects, home fragrance and gifting | Verified (catalogue) |
| Positioning | Premium, modern, thoughtful, elegant, accessible luxury | Owner-stated (brief) |
| Website and domain | https://budandthings.com/ (budandthings.com) | Verified |
| Brand elements | Primary logo, leaf mark, stacked and horizontal logos, roundel, monograms, patterns, packaging and label templates | Verified (`bud-and-things/brand/`, `system/`) |
| Brand palette | See E-02. **Owner decision pending** | Open |

The existing brand identity must be preserved. Do not redesign or redefine it.

### 2.2 Business model

| Channel | Evidence | Status |
|---|---|---|
| Own website | Built: shop, checkout, Owner view | Implemented in code; not open to the public |
| Offline and local sales | Offline-order feature in Owner view | Owner-reported; feature implemented |
| Amazon | No code integration; marketplace price and EAN fields exist in the sheet import | Requires Verification |
| Other marketplaces | None | Planned |
| Social media | Pinterest feeds built (`tools/build-pinterest.js`); other channels not evidenced | Partially Implemented |
| Corporate and bulk gifting | A "Corporate and bulk gifts" page exists | UI Only until verified |
| Seasonal and festive | A Diwali catalogue page exists | Implemented (static page) |

### 2.3 Existing infrastructure

| Component | Actual | Status |
|---|---|---|
| Hosting | GitHub Pages, via `pages.yml` | Verified |
| DNS, SSL, headers | Cloudflare | Owner-reported; headers checked 03-11-2026 |
| Database, sign-in, functions | Supabase (Postgres, Auth, Edge Functions) | Verified in code; live state needs verification |
| Payments | Razorpay | Implemented in code; live test owner-reported |
| Shipping | Shiprocket | Implemented in code; live label test open |
| Email | Resend through the `notify` function | Implemented in code; live status unverified |
| Media | Cloudinary (unsigned upload preset) | Implemented in code |
| Analytics and ads | Meta Pixel and Google Analytics only after consent, and only if IDs are set. No IDs are set | Implemented; inactive |
| GST | Not registered | Owner-stated; consistent with code |
| Udyam, Amazon seller account, Shiprocket account | See E-10 | Owner-stated, unverified |

### 2.4 Product and manufacturing context

The sheet snapshot lists 32 items in these types: Glass candle, Murphy candle, Jar candle, Moulded candle, Tealight candle, Jesmonite tray, Jesmonite dish and DIY Paint Kit. Product IDs follow `BNT-PRD-<CODE>-<NNN>`.

Product documentation covers: product IDs, names, descriptions, categories, wax, fragrance, wick and vessel specifications, material consumption, bill of materials, production, labour and packaging costs, offline and online prices, quality checks, burn tests, photography, storage and handling, and safety instructions.

**Never invent recipes, formulations, quantities, costs, prices or test results.** The repository holds only: the sheet fields (id, name, type, scent, colour, grams, price, stock, show), empty cost and record templates (`audit/owner-pack/templates/`) and owner-confirmed label details (`audit/legal/label-details.md`, which includes burn-time ranges that the owner supplied; they are not test results).

---

## 3. Execution governance: mandatory rules

1. Study the entire repository first.
2. Understand the actual website and business implementation.
3. Inspect existing documentation before creating new documents (the 56 existing Markdown files, section 0 E-09).
4. Identify each feature and its real implementation status.
5. Do not invent functionality, integrations, APIs, business rules or database structures.
6. Do not overwrite existing documentation. Link to it, quote it with its path, or supersede it by a recorded change.
7. **Do not modify application source code, workflows, the schema or the functions.** Write only under `docs/`.
8. Do not add dependencies or technology to the project. Local tools used only to validate documents (for example a Mermaid parser) must not be committed.
9. Do not expose secrets, credentials, keys, passwords, tokens or personal contact details (phone numbers, the postal address) in documentation.
10. Do not mark unverified functionality as implemented.
11. Do not mark a document Approved without the owner's explicit approval.
12. Distinguish existing functionality from proposed functionality in every document.
13. Keep document IDs and cross-references consistent.
14. Use Git for every documentation change, on a working branch. **Never push to `main`.** Open a pull request. Merge only when the owner says so.
15. Keep all documentation editable and maintainable.
16. Preserve the existing brand guidelines.
17. Do not delete or rename existing project files without approval.
18. Do not create meaningless placeholders. A document with no verified source data must still contain its purpose, the verified current state, the fields to capture, who holds the data and the status Pending Validation (E-14).
19. Record missing information instead of assuming. Use `[TBD]` and add it to the Open Questions Register.
20. Name every decision that needs the owner.
21. **Evidence standard:** each factual statement carries a repository path (with a line or section where practical), a log reference, or an owner statement with its date. A statement with none of these is `[TBD]`.
22. Diagrams must be validated. Mermaid sources are parsed before commit. `.drawio` files are produced only if they can be validated; otherwise they are listed as not produced, not faked.
23. Test results come only from real runs. Cite the CI run or the command output. Planned and executed tests are kept apart.

---

## 4. Phase 1: complete project discovery

Do not write the full documentation until this assessment is finished. Start from what already exists: `audit/00_PROJECT_DISCOVERY.md`, `01_WEBSITE_INVENTORY.md`, `03_FRONTEND_AUDIT.md`, `04_BACKEND_API_AUDIT.md`, `05_DATABASE_AUDIT.md`, `11_INFRASTRUCTURE_AUDIT.md`, `26_MASTER_FINDINGS_REGISTER.md`, `28_CLOSEOUT_STATUS.md` and `BRIEF_FACTS.md`. Re-verify them against the code; do not copy them blindly.

### 4.1 Repository assessment
Structure, folders, existing documentation, source files, configuration, package manifests (none exist), build configuration, dependency versions (vendored libraries are in `prototype/vendor/VERSIONS.md`), environment variable references, Git branches and history, deployment configuration, automation, scripts and workflows.

### 4.2 Application assessment
- **Frontend:** page structure, routes (hash routes such as `#home`, `#shop`, `#p-<id>`, `#checkout`, `#admin`), components, navigation, responsive design, forms, catalogue, product pages, search and filtering, cart, checkout, customer accounts, the Owner view, SEO, accessibility.
- **Backend:** business logic in SQL functions, Edge Function endpoints, authentication, authorisation, validation, error handling, logging, notifications, third-party integrations.
- **Database:** technology, schema, tables, fields, relationships, constraints, indexes, validation, backup mechanisms, migrations (there are none; `schema.sql` is re-run by hand).
- **Integrations:** payment, shipping, email, OTP, analytics, social, marketplace and automation. An integration exists only if code or a log proves it. Credentials, a screen or a setting alone prove nothing.

### 4.3 Deployment and infrastructure
Hosting, domain, DNS, SSL, CDN, GitHub Pages, Supabase, Cloudflare, build and deploy pipeline, CI/CD, environment separation (state plainly if there is no staging), backups, monitoring, logging, availability. Document what exists, not an ideal.

### 4.4 Feature status classification
Implemented, Partially Implemented, UI Only, Backend Only, Not Implemented, Planned, Requires Verification, Deprecated (definitions as in v1.0).

### 4.5 Discovery deliverables
`docs/00_Project_Overview/PROJECT_DISCOVERY_REPORT.md`, `EXISTING_FUNCTIONALITY_INVENTORY.md`, `TECHNOLOGY_STACK_REGISTER.md`, `OPEN_QUESTIONS_REGISTER.md`. The report covers: executive summary, business overview, repository, technology stack, application architecture, frontend, backend, database, API and integration assessments, hosting and deployment, security observations, existing and missing functionality, technical debt, dependencies, risks and recommendations. No application code is changed.

---

## 5. Phase 2: business documentation

Create: BRD, Business Overview, Business Model, Project Charter, Project Scope, Business Process Document, Business Rules, Goals and Objectives, Business Model Canvas, SWOT, Market and Competitor Analysis, Stakeholder Register, Business Risk Assessment, Business Continuity Plan, Growth Strategy, Business Roadmap, Business Operations Overview.

The BRD contains: document control, executive summary, background, problem, objectives, scope, out of scope, stakeholders, existing and proposed processes, requirements, rules, constraints, assumptions, dependencies, risks, success criteria, KPIs, open questions, approval requirements. Requirement IDs: BR-001, BR-002 and so on.

Processes to document: product development, raw material procurement, manufacturing, quality checks, inventory, product listing, customer acquisition, order processing, payment collection, shipping, returns, refunds, customer support, marketplace operations, financial reconciliation. Each is labelled **as-built** (for example the Owner view order flow) or **proposed**.

Competitor and market content must cite a source with its date, or be marked [TBD]. Do not invent market figures.

---

## 6. Phase 3: product and software requirements

Create: PRD, FRD, SRS, User Stories, Use Case Specification, Acceptance Criteria, Feature Register, Product Backlog, Product Roadmap, Requirements Traceability Matrix, Non-Functional Requirements Register, Product Change Register.

- **PRD:** vision, objectives, users, personas, problems, scope, feature inventory and priority, user journeys, functional and non-functional expectations, success metrics, dependencies, risks, release strategy.
- **FRD:** for every requirement: ID, module, feature, description, actor, preconditions, trigger, main, alternative and exception flows, business rules, input validation, output, dependencies, acceptance criteria, priority, implementation status, related test cases. Modules: website, homepage, navigation, catalogue, categories, product detail, search, filters, cart, checkout, registration, login, profile, orders, payment, shipping, tracking, returns, refunds, notifications, contact and support, admin panel (Owner view), inventory, product management, content management, analytics, reports. Only modules backed by evidence are documented as existing; the rest are marked Proposed.
- **SRS (IEEE-inspired):** introduction, purpose, scope, definitions, system overview, overall description, user classes, operating environment, functional requirements, external, hardware, software, API and database interfaces, non-functional requirements (security, performance, reliability, availability, scalability, maintainability, usability, accessibility, compatibility), data requirements, constraints, dependencies, assumptions, acceptance criteria.

---

## 7. Phase 4: technical architecture

Create: Software Architecture Document, HLD, LLD, System, Application, Infrastructure and Deployment Architecture, Database Design, API Architecture, Integration Architecture, Technology Stack Document, Third-Party Dependency Register, Technical Debt Register, Technical Risk Assessment.

- **HLD:** system overview, architecture style, major components and responsibilities, communication, external integrations, data storage, security boundaries, infrastructure, deployment, scalability, reliability, dependencies.
- **LLD:** module-level design, API interactions, request and response structures, database operations, validation, exceptions, authentication and authorisation, logging, configuration. Source code is the primary evidence.
- **Database documents:** Design Document, Schema, ERD, Data Dictionary, Relationships, Validation Rules, Indexes, Constraints, Migration documentation (the re-runnable `schema.sql` process), Data Retention Policy, Backup and Recovery Strategy. Never invent tables or relationships.
- **API documents:** for each real endpoint: API ID, endpoint, method, purpose, authentication, authorisation, parameters, headers, body, response, errors, validation, dependencies, status. The real surface is: the Supabase REST tables protected by row-level security, the database RPC functions, and the three Edge Functions. Produce OpenAPI for the Edge Functions and a catalogue for the RPC functions. Do not invent endpoints.

---

## 8. Phase 5: diagrams

Create editable diagrams in Mermaid (`.mmd`), and Draw.io (`.drawio`) only where it can be validated. Each diagram is labelled **as-built** (verified) or **proposed**.

- **Business:** ecosystem, model, process flow, product lifecycle, order-to-delivery, customer journey.
- **System:** context, architecture, application, component, infrastructure, deployment, integration.
- **Data:** ER diagram, DFD levels 0, 1 and where needed 2, data lifecycle.
- **Functional:** registration, login and authentication, browsing, search and filtering, cart, checkout, payment, order management, shipping and tracking, returns and refunds, admin management, inventory.
- **Technical:** frontend-backend communication, API sequences, third-party integration flow, authentication sequence, CI/CD pipeline, backup and recovery.
- **Manufacturing:** raw material procurement, candle manufacturing, quality control, packaging and dispatch. Manufacturing flows are **proposed** until the owner confirms the real process.

Store sources in `docs/04_Diagrams/SOURCE/`. Include a diagram index with descriptions and links. Every Mermaid file must parse without errors before it is committed.

---

## 9. Phase 6: UI/UX and brand documentation

Create: UI/UX Specification, Brand Identity Guidelines, Design System, Colour Palette Specification, Typography Guidelines, Component Library, Website Sitemap, Navigation Flow, Wireframe Inventory, Screen Inventory, Responsive Design Guidelines, Accessibility Guidelines, UI/UX Quality Checklist.

Document: logo usage, colours (record both palettes and the open decision, E-02), typography (record the disagreement, E-11), spacing, buttons, cards, forms, navigation, product cards and detail layouts, breakpoints, mobile, error, loading and empty states, accessibility. The sources are `bud-and-things/system/` and the live themes in `prototype/index.html`. Do not introduce a new visual identity.

---

## 10. Phase 7: testing and quality assurance

Create: Master Test Strategy, Test Plan, Test Scenarios, Detailed Test Cases, Functional, UI/UX, API, Integration, Database, Cross-browser, Responsive, Performance, Security, Accessibility and SEO test plans, UAT, Regression, Defect Register, Test Execution Report, Test Summary Report, Test Closure Report.

Every test case holds: Test Case ID, Requirement ID, module, scenario, preconditions, steps, test data, expected result, actual result, pass or fail, severity, priority, evidence reference, execution date.

Existing automated checks (the 13 test suites, the 13-page audit, the syntax check and the secret scan) are real evidence only when you cite a CI run or a command output. Anything not run is **Planned**. Do not claim execution without evidence. Keep planned and executed results separate.

---

## 11. Phase 8: security, privacy and compliance

Create: Security Architecture, Threat Model, Security Assessment, Access Control Matrix, Authentication and Authorisation Policy, Data Protection Policy, Privacy Policy, Terms and Conditions, Cookie Policy, Incident Response Plan (reuse the data breach plan), Vulnerability Management Plan, Security Testing Plan, Backup and Disaster Recovery Plan, Compliance Register, Data Retention Policy.

Review against OWASP guidance: authentication, authorisation, passwords, sessions, API security, input validation, injection, XSS, CSRF, CORS, uploads, secrets, HTTPS, security headers, rate limiting, dependency vulnerabilities, database and administrative access, logging, backup security. Reuse `audit/08` and `09`. Never put credentials in documentation.

**Indian compliance register.** Evaluate Udyam, GST, Legal Metrology, the Consumer Protection Act and E-commerce Rules, packaging and labelling, digital personal data protection, website privacy, payment gateway onboarding, marketplace policies, tax and accounting, local trade registrations and product safety standards. For each: regulatory reference, applicability, Mandatory, Conditional or Recommended, current status, required action, evidence required, responsible person, official government source, last verification date.

- Use current official government sources, with the date each was checked. If a source cannot be checked in the session, write `[TBD: verify]`. Do not rely on memory.
- Do not present legal or tax assumptions as advice. Every row says whether professional review is recommended. The owner decided on 16-11-2026 that a CA is not needed for now; record that decision and the conditions for revisiting it (a marketplace listing, turnover nearing ₹35 lakh, or an office saying registration is required).

---

## 12. Phase 9: e-commerce and business operations

Create: Business Operations Manual and SOPs for order management, payment management, payment reconciliation, shipping and delivery, refund and cancellation policy, return and replacement policy, inventory, product listing, customer support, supplier management, procurement, packaging, marketplace operations, complaint management, customer feedback, sales management, expense management, business reporting.

Each SOP gives workflow, responsibilities, inputs, outputs, controls, exceptions and escalation. Clearly mark each as **implemented** (what the Owner view and database do today) or **proposed**. The policies must match what the site actually says (replace if damaged or wrong within 7 days; refund only if no replacement; no change-of-mind returns) and must not contradict it.

---

## 13. Phase 10: manufacturing and costing

Create: Product Master Register, Product Specification, Bill of Materials, Raw Material Register, Supplier Register, Formulation Register, Manufacturing SOP, Batch Production Register, Quality Control SOP, Quality Inspection Checklist, Burn Test Report, Product Costing, Product Pricing Register, Packaging Specification, Labelling Specification, Storage and Handling Guidelines, Safety and Warning Guidelines, Product Change Register.

For each product capture only verified data: product ID, name, category, description, dimensions, materials, wax type and quantity, fragrance and quantity, wick, vessel, packaging, manufacturing instructions, quality standards, burn-test observations, material, labour and other direct costs, working cost, offline and online price, photographs, version, approval status.

The Product Master Register is built from the sheet snapshot (32 items; fields id, name, type, scent, colour, grams, price, stock, show). Every field the repository does not hold stays `[TBD]` with the data owner named. Never overwrite a historical formulation or test result; keep a revision history. Use the existing ID convention.

---

## 14. Phase 11: DevOps, deployment and maintenance

Create: Git Workflow, Branching Strategy, Deployment Guide, Infrastructure and Environment Configuration, CI/CD Documentation, Release Management SOP, Version Control Policy, Backup and Recovery Plan, Monitoring and Logging Strategy, Incident Management SOP, Change Management SOP, Website Maintenance SOP, Rollback Procedure, Disaster Recovery Plan, Dependency Management Register.

Document the real process: changes go through a pull request, the automatic checks must pass, the owner says "merge", then `pages.yml` publishes the site. The database and functions are deployed by hand and recorded in `DEPLOYED_STATE.md`. State plainly that no separate staging environment is evidenced, and whether branch protection exists is `[TBD]`. Do not introduce new hosting without an approved proposal.

---

## 15. Phase 12: marketing, brand and growth

Create: Brand Strategy, Brand Positioning, Brand Voice Guidelines, Marketing, Digital Marketing, Social Media, Instagram, Pinterest and YouTube strategies, Content Strategy and Calendar, SEO Strategy, Customer Persona Document, Customer Journey Map, Campaign Management SOP, Retention and Loyalty Strategies (the Bud Points feature exists), Marketplace Growth Strategy, Corporate Gifting Strategy, Business Expansion Roadmap.

Do not invent performance or campaign results. Mark every item as **existing activity** (with evidence) or **recommendation**.

---

## 16. Phase 13: project governance

Create: Project Management Plan, Project Charter, Product, Development and Release Roadmaps, RACI Matrix, RAID Register, Risk Register, Decision Log, Change Request Register, Document Control Register, Documentation Review Register, Approval Register, Status Report, Meeting Minutes and Release Notes templates, Enhancement Register, Technical Debt Register, Open Questions Register, Dependency Register.

**RACI:** name the approver as `[TBD: owner to confirm]`. The legal owner is Shivani Yadav. The day-to-day contact on the site is Abhishek Yadav. Record who may approve, and do not assume.

**ID formats:** BR-001, PR-001, FR-001, NFR-001, US-001, UC-001, TC-001, DEF-001, CR-001, DEC-001, RISK-001, API-001, SOP-001, OQ-001 (open question).

---

## 17. Phase 14: requirements traceability

Trace Business Requirement → Product Requirement → Functional Requirement → Technical Component → Database or API → Test Case → Implementation Status → Release. Every requirement has a unique ID.

Identify: requirements without implementation, implemented functionality without a requirement, requirements without tests, tests without requirements, unapproved changes, conflicts and missing dependencies.

Create `docs/02_Product_Requirements/REQUIREMENTS_TRACEABILITY_MATRIX.xlsx`, with a CSV or Markdown mirror so Git diffs are readable. Update it whenever requirements or implementation change.

---

## 18. Phase 15: repository structure

Use this target structure, adapted to real needs. Avoid duplication. Reuse and improve an existing accurate document instead of writing another.

```
docs/
  README.md  BASELINE_MANIFEST.md  DOCUMENTATION_MASTER_REGISTER.md
  DOCUMENTATION_CHANGE_CONTROL.md  DOCUMENTATION_REVIEW_REGISTER.md
  DOCUMENTATION_QUALITY_AUDIT.md  PROGRESS_TRACKER.md
  00_Project_Overview/          charter, overview, scope, discovery report, functionality inventory,
                                technology stack register, stakeholder register, open questions
  01_Business_Requirements/     BRD, business model, process document, rules, requirements register,
                                SWOT, market and competitor analysis, business risk assessment
  02_Product_Requirements/      PRD, FRD, SRS, user stories, use cases, acceptance criteria,
                                feature register, roadmap, traceability matrix (.xlsx)
  03_Architecture_and_Design/   software, system, application, infrastructure, integration, API
                                architecture, HLD, LLD, database design
  04_Diagrams/                  README, index files per diagram family, SOURCE/ (.mmd, .drawio)
  05_UI_UX_and_Brand/           UI/UX specification, design system, brand guidelines, sitemap,
                                navigation flow, component inventory, accessibility
  06_Database_and_API/          schema, data dictionary, API documentation, integration register,
                                validation rules, data management policy, OPENAPI/
  07_Testing_and_QA/            strategy, plan, scenarios, TEST_CASES.xlsx, UAT, regression,
                                security, performance, DEFECT_REGISTER.xlsx, summary report
  08_Security_and_Compliance/   security architecture, threat model, access control matrix,
                                privacy, terms, cookies, incident response, compliance register,
                                security assessment
  09_Ecommerce_and_Operations/  order, payment, shipping, refund, return, inventory, support and
                                vendor SOPs, operations manual
  10_Product_and_Manufacturing/ master, specifications, BOM, manufacturing SOP, costing,
                                quality control, burn tests, batch register, packaging and labelling
  11_DevOps_and_Maintenance/    git workflow, deployment, environment, CI/CD, release, backup,
                                monitoring, change management, maintenance SOP
  12_Marketing_and_Growth/      positioning, marketing, social media, content, SEO, personas,
                                customer journey, campaign management
  13_Project_Governance/        this prompt, roadmap, RACI, RAID, decision log, change requests,
                                approval register, risk register, document control policy
```

Every document in the master register must be a real file. Existing documents are linked from a mapping table in `docs/README.md`.

---

## 19. Phase 16: documentation standards

Every document includes, where applicable: title, document ID, version, status, prepared by, reviewed by, approval status, creation date, last updated date, revision history, purpose, scope, definitions, abbreviations, references, main content, assumptions, dependencies, risks, open questions, related documents.

**Statuses:** Draft, Under Review, Approved, Implemented, Pending Validation, Deprecated, Not Applicable. Never mark a document Approved without actual approval.

**Document ID convention:** BNT-PRJ-001, BNT-BRD-001, **BNT-PRQ-001 (PRD, pending owner decision E-05)**, BNT-FRD-001, BNT-SRS-001, BNT-HLD-001, BNT-LLD-001, BNT-API-001, BNT-TEST-001, BNT-SEC-001, BNT-SOP-001, BNT-GOV-001 (this document). IDs are unique and never reused.

**Versioning:** 0.1 initial draft, 0.2 revised draft, 1.0 first approved version, 1.1 minor approved update, 2.0 major approved revision. **Dates are DD-MM-YYYY.**

---

## 20. Phase 17: single source of truth and change control

The `docs/` tree is the single source of truth. No developer or AI agent may redefine an approved business requirement or rule, functional requirement, feature, user journey, database structure, API contract, architecture decision, brand guideline or operational process.

If documentation and implementation disagree: identify the inconsistency; record the document and requirement IDs; describe the current implementation and the documented requirement; assess business and technical impact; propose resolutions; and get owner approval before changing the baseline. **Never silently change code to match documents, or documents to match code.**

**Change Request** fields: change ID, requester, date, related document IDs, existing requirement, proposed change, business justification, functional, technical, database, API, security, testing and cost impact, risks, dependencies, priority, approval status, implementation status, validation result, closure date. Keep a central Change Request Register.

---

## 21. Phase 18: AI coding agent governance

Before development, every agent reads: the root README, `docs/README.md`, the Project Charter, the approved BRD, the relevant PRD, FRD and SRS, the architecture documents, the diagrams, the database and API documentation, the RTM, the relevant test cases, the Change Request Register, the Decision Log, and the known risks and open questions. It also reads `bud-and-things/WORKFLOW.md` and `bud-and-things/tasks/LAUNCH_CHECKLIST.md`.

**During development:** follow approved requirements; preserve existing functionality and the brand identity; follow the approved architecture; avoid new dependencies; keep security practices; follow existing coding conventions; do not introduce undocumented features; record deviations; request approval for material changes. Run the project's checks before any change (`node bud-and-things/tools/check-syntax.js`, `scan-secrets.js`, the test suites).

**After development:** update the documentation, diagrams, database and API specifications, requirements, test cases, RTM and release notes; record change references; validate consistency.

If information is missing, raise an open question or a change request before making a material design decision.

---

## 22. Phase 19: documentation validation and quality audit

When generation is complete, audit: completeness, accuracy, consistency, traceability, readability, technical and business correctness, architecture, database and API alignment, diagram correctness, requirement coverage, test coverage, security coverage, compliance references, document IDs, cross-references, version history, Markdown formatting and file organisation.

Verify that: no documents contradict one another; no assumption is shown as fact; no API, table or integration is fabricated; no proposed feature is shown as implemented; no test result or compliance status is invented; no secret or phone number appears; every diagram parses; every link points to an existing file. Use a script for link, ID and secret checks, and show its output.

Create `docs/DOCUMENTATION_QUALITY_AUDIT.md` and `docs/DOCUMENTATION_MASTER_REGISTER.md` (document ID, name, category, description, priority, version, status, last updated, dependencies, approval status, validation status, owner or reviewer).

---

## 23. Phase 20: the official documentation baseline

**Baseline name:** BUD & THINGS Master Project Documentation Baseline. **ID:** BNT-DOC-BASELINE-001. **Version:** 1.0 (candidate until approved). **Candidate date:** 16-11-2026. **Approval date:** [TBD]. **Location:** `docs/`. **Purpose:** the permanent, controlled reference for all business, product, technical and operational activity.

### 23.1 Freeze process
Audit; resolve critical contradictions; list documents needing owner decisions; prepare the manifest and approval register; present the pending decisions to the owner; obtain explicit approval; freeze the snapshot; record the commit hash; tag.

- Until the owner approves, the only tag permitted is `BNT-DOC-BASELINE-CANDIDATE-v1.0`, and it is not an approved baseline.
- After explicit approval: `BNT-DOC-BASELINE-v1.0`.
- Creating or pushing a tag needs the owner's say-so, as pushing does.

### 23.2 Manifest
`docs/BASELINE_MANIFEST.md`: baseline ID, name, version, creation date, approval status, repository reference, commit hash, tag, approved and pending documents, open questions, known limitations, outstanding risks, last validation date, baseline owner.

### 23.3 Protection
After approval: protect approved documentation from unreviewed change, use Git history for traceability, require review for changes, preserve the snapshot, keep revision history, and never silently overwrite an approved requirement. The baseline is controlled, not immutable. Whether GitHub branch protection can be enabled is an owner decision.

---

## 24. Phase 21: periodic review

| Documentation | Review |
|---|---|
| Business requirements | On every approved business change |
| Product requirements | On every product change |
| Architecture | Quarterly and after major changes |
| API and database | After relevant technical changes |
| Security and privacy | At least annually and after significant changes |
| Compliance | Quarterly and when regulations change |
| Manufacturing | When materials or processes change |
| Operations SOPs | When workflows change |
| Marketing strategy | Quarterly |
| Project roadmap | Monthly or when priorities change |

Record every review in the Documentation Review Register.

---

## 25. Phase 22: final deliverables and acceptance

Deliver: the discovery report; business documentation; BRD; PRD; FRD; SRS; HLD; LLD; Software Architecture Document; Database Design Document; API Documentation; system architecture diagrams; business and functional flow diagrams; the database ERD; DFDs; UI/UX documentation; Brand Guidelines; Test Strategy; Test Cases; UAT documentation; security documentation; the Compliance Register; the Business Operations Manual; manufacturing documentation; costing and BOM documentation; the Deployment and Maintenance Manual; marketing and growth documentation; project governance documents; the Requirements Traceability Matrix; the Documentation Master Register; the Quality Audit; the Change Control Policy; the Baseline Manifest; the Approval Register; and the central README.

**The baseline may be submitted for approval only when:** critical documentation exists; the real project has been studied; business, product and functional requirements are documented; the architecture, database and API documentation are checked against the code; diagrams are validated; testing documentation exists; security and compliance gaps are identified; traceability is established; cross-document consistency is checked; all missing information is recorded; no critical contradiction remains; and the owner has had the chance to review and approve.

Documents that need more information stay Draft, Pending Validation or Under Review. **Do not falsely approve the repository.**

---

## 26. Execution plan

Run these stages in order. Do not skip validation to save time. **Do Stage 1 only, then stop and report to the owner before Stage 2.**

1. Repository discovery and the discovery report.
2. Business documentation.
3. Product documentation.
4. Technical architecture.
5. Diagrams.
6. UI/UX documentation.
7. Testing and quality.
8. Security and compliance.
9. Business operations.
10. Marketing and governance.
11. Traceability and validation.
12. Baseline preparation (candidate, manifest, master register, approval package).
13. Owner approval and locking.

Keep `docs/PROGRESS_TRACKER.md` (stage, documents done, checkpoint commit, open questions). If a session ends, resume from the last verified checkpoint and never regenerate finished documents without cause.

---

## 27. Final execution report

Report: **A. Repository discovery** (structure, stack, existing and missing functionality, technical risks). **B. Statistics** (documents identified, created, updated, pending, needing owner confirmation; diagrams; requirements; test cases). **C. Findings** (business, product, technical, security, compliance and operational gaps). **D. Baseline status** (candidate or approved, version, commit, tag, documents pending approval, outstanding risks). **E. Next steps** (immediate, development, security, operational, future). Give direct links to the documents and a navigation guide.

---

## 28. Final principle

BUD & THINGS operates on this controlled lifecycle:

**DOCUMENT → REVIEW → APPROVE → DEVELOP → TEST → VALIDATE → UPDATE DOCUMENTATION → RELEASE**

No undocumented assumption, unapproved business-rule change, untraceable modification or uncontrolled architectural decision is introduced. The aim is a professionally managed, secure, maintainable and fully documented business and digital ecosystem for BUD & THINGS by Ashi.

**Do not merely create documentation files. Establish the permanent documentation, development and governance foundation of BUD & THINGS.**

*End of the corrected master execution prompt, version 1.1.*

---

## Appendix A. Owner decisions needed before the baseline can be approved

| ID | Decision | Default until decided |
|---|---|---|
| OQ-001 | Which palette is the approved brand palette: Silk Maroon and Gold, or ivory, sand, terracotta, olive, chocolate and brass (E-02) | Document both; call Silk the live theme |
| OQ-002 | Which fonts are approved: Cormorant Garamond and Lato, or Playfair Display and Montserrat (E-11) | Document both; the site uses Playfair Display and Montserrat |
| OQ-003 | PRD document ID: BNT-PRD-001 or BNT-PRQ-001 (E-05) | BNT-PRQ-001 |
| OQ-004 | Who approves documents (the legal owner, the day-to-day contact, or both) | [TBD] |
| OQ-005 | Confirm Udyam, the Amazon seller account and the Shiprocket account, with evidence (E-10) | Owner-stated, unverified |
| OQ-006 | Confirm "soy wax" and supply the real product data: wax, wick, vessel, fragrance, quantities, costs, burn tests (E-06) | [TBD] |
| OQ-007 | Whether Sun Muse and Berry Swirl are current products (E-06) | Not in the sheet snapshot |
| OQ-008 | Whether GitHub branch protection can be turned on for `main` | [TBD] |
| OQ-009 | Whether a separate staging environment will exist | None evidenced |
| OQ-010 | When to revisit the CA decision (E-13) | On the three conditions in section 11 |
