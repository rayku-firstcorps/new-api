# Homepage User-Friendly Redesign PRD

## 1. Background

The current homepage is strongly oriented toward developers and infrastructure operators. The first viewport emphasizes API gateway concepts, terminal-style request examples, API endpoints, JSON payloads, tokens, stream mode, upstream routing, and protocol compatibility.

For ordinary users, this creates unnecessary friction. A first-time visitor may not quickly understand:

- What the product helps them do.
- Whether they need programming knowledge to use it.
- How to start using it with common AI tools.
- Whether model access, usage, balance, and costs are easy to manage.

This redesign should keep developer capabilities available, but move the first layer of communication toward a user-friendly "one account to connect, manage, and use multiple AI models and applications" story.

## 2. Product Goals

1. Reduce comprehension cost for ordinary users.
   The first viewport should make it clear within 5 seconds that this product unifies AI model access, app connection, quota, billing, and usage records.

2. Reduce technical pressure in the first impression.
   The first viewport should not default to terminal code, JSON, curl, API endpoints, or protocol-centric visuals.

3. Improve start/signup conversion.
   The primary CTA should clearly guide unauthenticated users to get started. Secondary CTAs should guide users to pricing, supported apps, or documentation.

4. Preserve developer entry points.
   API, docs, SDK, and compatibility details should remain available, but move to a secondary content layer or developer-focused section.

5. Respect existing engineering constraints.
   Follow the existing React, i18n, Tailwind, and component structure. Do not introduce unnecessary dependencies.

## 3. Non-Goals

This project does not include:

- Backend capability changes.
- Login, signup, billing, model management, or token management logic changes.
- Replacement or removal of protected project identity, organization identity, copyright, license, or attribution text.
- A new design system.
- A new analytics platform. Event definitions may be reserved for existing or future analytics integration.

## 4. Target Users

### Ordinary Users

Users who:

- Use AI clients such as Cherry Studio, Open WebUI, LobeChat, or ChatBox.
- Want one account to manage multiple models.
- Care about availability, price, balance, and usage.
- May not understand API Gateway, upstream services, or protocol compatibility.

### Advanced Users and Developers

Users who:

- Need unified API access.
- Care about OpenAI, Claude, Gemini, and similar compatibility.
- Care about rate limits, routing, load balancing, logs, and cost controls.

The redesigned homepage should prioritize ordinary users first and support developers as a secondary path.

## 5. Information Architecture

The default homepage should be organized as:

1. Hero: ordinary-user value proposition.
2. Product preview: account, models, apps, usage, and cost overview.
3. Supported models and applications.
4. Core benefits.
5. Steps to start.
6. Developer access section.
7. Final CTA.

## 6. Hero Requirements

### Current Problems

The current hero includes or emphasizes:

- `AI Application Infrastructure Foundation`
- `Unified API Gateway`
- Standard API protocol messaging
- Terminal-style API demos
- curl, endpoints, headers, JSON, tokens, and stream metadata

These elements are useful for developers but unfriendly as the primary first impression.

### Proposed Hero Copy

Primary heading:

```text
One account for leading AI models
```

Supporting text:

```text
Manage models, quota, billing, and usage records in one place. Connect ChatGPT, Claude, Gemini, DeepSeek, and other services to the AI tools you already use.
```

Primary CTA:

```text
Get Started
```

Secondary CTA:

```text
View Pricing
```

Tertiary developer entry:

```text
Developer Docs
```

Localized Chinese product copy may use:

```text
一个账号，连接主流 AI 模型
```

```text
统一管理模型、额度、账单和使用记录，让 ChatGPT、Claude、Gemini、DeepSeek 等服务更容易接入和使用。
```

### Hero Visual

Replace the default terminal demo with a product dashboard preview.

Recommended preview content:

- Current balance.
- Monthly usage.
- Frequently used models.
- Connected applications.
- Recent request status.
- Example request cost.
- Copy connection config entry.

### Acceptance Criteria

- The first viewport does not show `curl`.
- The first viewport does not show full API endpoint examples.
- The first viewport does not show JSON request bodies.
- The first viewport shows at least 3 ordinary-user concepts from: models, balance, quota, billing, usage, apps, connection status.
- For unauthenticated users, the primary CTA goes to signup.
- For authenticated users, the primary CTA goes to dashboard.
- Documentation remains reachable but is not the dominant first CTA.

## 7. Core Benefits Section

### Current Problem

The current feature messaging is developer-first and includes concepts such as:

- Lightning Fast
- Developer Friendly
- Compatible API routes
- Load Balancing
- Rate Limiting

These are valid capabilities, but they should not be the first benefit layer for ordinary users.

### Proposed Benefit Cards

1. Unified model access
   Use multiple model providers through one account and one control surface.

2. Clear usage and cost
   See balance, request records, and per-use costs in real time.

3. Works with common AI tools
   Connect to Cherry Studio, Open WebUI, LobeChat, and similar clients.

4. Team sharing and permissions
   Manage members, quota, permissions, and records in one place.

5. Reliable availability
   Reduce interruptions and repeated configuration through managed service routing.

6. Developer-ready access
   Keep compatible APIs and documentation available for advanced integrations.

### Acceptance Criteria

- The first 5 benefit cards do not use developer-only terms as titles.
- `Developer Friendly` or equivalent developer messaging may remain, but it must not be the first benefit.
- Every benefit description states a user-facing outcome, not only a system capability.

## 8. Stats Section

### Current Problem

Current metrics such as upstream services, compatible API routes, and scheduling controls are system-oriented rather than user-oriented.

### Proposed Metrics

- `50+` leading model services.
- `100+` billable models.
- Multiple AI app integrations.
- Real-time usage and cost records.

### Acceptance Criteria

- Stats copy does not use `upstream services`.
- Stats copy does not use `API routes`.
- Stats are understandable without technical background.

## 9. Steps to Start Section

### Proposed Steps

1. Create an account.
   Sign up and enter the console.

2. Get connection settings.
   Create a token and choose available models or plans.

3. Paste into your AI tool.
   Use the configuration in Cherry Studio, Open WebUI, or another supported client.

4. Track usage and cost.
   Check balance, request records, and cost details anytime.

### Acceptance Criteria

- Step copy is not developer-only.
- At least one step explicitly references common AI tools.
- At least one step explicitly references usage, cost, balance, or quota.

## 10. Developer Section

Developer capabilities should remain available, but be moved below ordinary-user onboarding content.

Recommended title:

```text
Full access for developers too
```

Recommended content:

- OpenAI, Claude, and Gemini-compatible interfaces.
- API key management.
- Request logs.
- Cost statistics.
- Rate limits.
- Documentation entry.

### Acceptance Criteria

- Documentation entry remains visible.
- API capability remains represented.
- Technical content does not dominate the hero visual area.

## 11. Visual Design Principles

The redesigned homepage should feel:

- Professional.
- Clear.
- Trustworthy.
- Friendly to ordinary users.
- Still credible for developers.

Design guidance:

- Avoid terminal code as the default hero visual.
- Avoid heavy API, JSON, or protocol visuals in the first viewport.
- Avoid a generic AI SaaS look dominated by purple-blue gradients.
- Prefer product-surface previews that expose real user concepts: models, apps, balance, usage, cost, and status.
- Keep CTA hierarchy clear on desktop and mobile.
- Ensure mobile layout has no horizontal scrolling.
- Ensure text never overlaps or overflows its parent.

## 12. i18n Requirements

All new frontend strings must use the existing i18n pattern:

```tsx
t('English source key')
```

Translation files:

```text
web/default/src/i18n/locales/{lang}.json
```

Supported languages:

- `en`
- `zh`
- `fr`
- `ru`
- `ja`
- `vi`

Development requirements:

- Do not hardcode Chinese or any other localized display string directly in components.
- Add or sync new translation keys.
- Follow existing flat JSON translation conventions.
- Use the frontend i18n workflow from `web/default/`.

Recommended command:

```bash
cd web/default
bun run i18n:sync
```

## 13. Technical Scope

Likely files:

- `web/default/src/features/home/components/sections/hero.tsx`
- `web/default/src/features/home/components/hero-terminal-demo.tsx`
- `web/default/src/features/home/components/sections/features.tsx`
- `web/default/src/features/home/components/sections/stats.tsx`
- `web/default/src/features/home/components/sections/how-it-works.tsx`
- `web/default/src/features/home/components/sections/cta.tsx`
- `web/default/src/i18n/locales/*.json`

Recommended new component:

- `web/default/src/features/home/components/home-dashboard-preview.tsx`

Technical constraints:

- Use React 19 and TypeScript.
- Use existing Tailwind and UI component patterns.
- Use existing icon libraries, preferably `lucide-react` where appropriate.
- Do not add large dependencies for this redesign.
- Prefer Bun for frontend commands.
- Preserve the custom homepage override behavior from `HomePageContent`.

## 14. Verifiable Acceptance Checklist

### Functional Acceptance

- Unauthenticated users see ordinary-user value messaging in the hero.
- Authenticated users see a primary CTA to dashboard.
- `Get Started` navigates to signup for unauthenticated users.
- `View Pricing` navigates to pricing.
- `Developer Docs` navigates to the configured docs URL.
- The homepage has no horizontal scrolling on mobile.
- The homepage renders correctly in dark mode.
- Custom homepage content still overrides the default homepage when configured.

### Content Acceptance

- The hero does not show curl.
- The hero does not show JSON request bodies.
- The hero does not use Gateway, Infrastructure, or Protocol as the core headline concept.
- The homepage keeps a developer documentation entry.
- The homepage keeps supported app information.
- The homepage explains models, usage, quota or balance, and cost in ordinary-user language.

### Engineering Acceptance

- TypeScript compilation passes.
- Frontend build passes.
- i18n keys are synced or manually completed.
- Protected project and organization identifiers remain unchanged.
- No unrelated refactors are included.

Recommended verification:

```bash
cd web/default
bun run build
bun run i18n:sync
```

## 15. Success Metrics

Suggested metrics after release:

- Hero primary CTA click-through rate.
- Pricing CTA click-through rate.
- Developer docs click-through rate.
- Signup completion rate from homepage.
- Homepage bounce rate.
- New user first successful configuration rate.
- Qualitative feedback mentioning "hard to understand", "too technical", or equivalent.

Recommended target direction:

- Increase primary CTA click-through rate.
- Reduce homepage bounce rate.
- Improve first successful configuration rate for non-developer users.
- Keep developer docs traffic discoverable without making it dominate the homepage.

## 16. Deliverables

The implementation should deliver:

1. Updated homepage code.
2. New product dashboard preview component.
3. Updated homepage copy.
4. Updated i18n keys and translations.
5. Build verification result.
6. Desktop and mobile screenshots.
7. Short implementation summary explaining how the homepage shifted from developer-first to ordinary-user-first.
