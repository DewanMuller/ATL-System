export type SuiteAtlLink = {
  label: string;
  href: string;
};

export type SuiteItem = {
  id: string;
  name: string;
  rhythm: string;
  summary: string;
  description: string;
  atlLink?: SuiteAtlLink;
};

export type SuiteLensId = "strategy" | "execution" | "culture";

export type SuiteLens = {
  id: SuiteLensId;
  name: string;
  tagline: string;
  color: string;
  items: SuiteItem[];
};

export const SUITE_LENSES: SuiteLens[] = [
  {
    id: "strategy",
    name: "Strategy",
    tagline: "Where the business is going, and why.",
    color: "#8DAA5B",
    items: [
      {
        id: "growth-strategy-workshop",
        name: "Growth Strategy Workshop",
        rhythm: "Annual",
        summary:
          "Sets — then every year re-tests — the company's core strategy, BHAG, and Winning Moves.",
        description:
          "In Year 1, a two-day deep-dive that aligns leadership on company DNA (purpose, vision, values), applies a financial three-filter system to select the single most scalable core business, and commits to three Winning Moves for the next 12 months, each with an owner and timeline — the launch pad for the whole BGC system, with findings feeding Founders DNA and Art of Scale diagnostics and Winning Moves cascading into 90-day execution roadmaps, OKRs, and the annual coaching rhythm. From Year 2 onward, it becomes the Annual Strategy Workshop: leadership climbs a five-level strategic maturity ladder — from DNA and target-customer clarity toward a lean repeatable model, competitive moats, and agility at scale — re-testing core strategy, customer persona, and value proposition, then resetting Winning Moves and keeping the BHAG and True-North metrics current so every rhythm below stays pointed at the same target.",
        atlLink: { label: "BHAG & Winning Moves — Above The Line", href: "/dashboard" },
      },
      {
        id: "executive-strategy-council",
        name: "Executive Strategy Council Session",
        rhythm: "Quarterly",
        summary:
          "A mid-quarter pulse check that catches strategic drift before it reaches the next Quarterly RAP.",
        description:
          "A focused mid-quarter session where the CEO and senior leadership step out of daily firefighting to cross-check performance data, market shifts, and resourcing against the annual strategy. It catches drift early — whether the business is still tracking to its BHAG and Winning Moves — and translates any course corrections into sales- and delivery-facing action before the next Quarterly RAP.",
      },
    ],
  },
  {
    id: "execution",
    name: "Execution",
    tagline: "How strategy gets delivered, day to day.",
    color: "#4F7CAC",
    items: [
      {
        id: "execution-workshop",
        name: "Execution Workshop",
        rhythm: "Annual",
        summary:
          "Turns strategy into an Execution Blueprint — OKRs and a Balanced Scorecard — then resets it every year.",
        description:
          "In Year 1, a two-day workshop that converts the strategy from the Growth Strategy Workshop into an Execution Blueprint — wildly important goals, quarterly OKRs, a draft Balanced Scorecard, and the organisational structure to deliver them — with every leader leaving owning 1-2 OKRs tied directly to the Blueprint, the starting point for the OKR coaching, MRAP, and QRAP rhythm that follows for the rest of the year. In later years, it becomes the Annual Execution Workshop: resetting the Blueprint, OKRs, and Balanced Scorecard as the business's complexity and headcount grow, re-testing whether last year's execution rhythm actually held under real pressure, and recalibrating the maturity level the team is coached toward next.",
        atlLink: { label: "OKRs — Above The Line", href: "/dashboard" },
      },
      {
        id: "quarterly-rap",
        name: "Quarterly RAP — Full Day Workshop",
        rhythm: "Quarterly",
        summary:
          "The quarterly deep-dive where the month's detail rolls up into a maturity check against the annual Blueprint.",
        description:
          "A one-day quarterly deep-dive into execution maturity: leadership reviews the last 90 days against the Balanced Scorecard, resolves what's blocking OKR delivery, and resets priorities for the next quarter. It's the strategic reset point in the execution rhythm — where MRAP's monthly detail rolls up into a maturity check against the annual Blueprint.",
        atlLink: { label: "QRAP — Above The Line", href: "/qrap" },
      },
      {
        id: "monthly-rap",
        name: "Monthly RAP (Review, Assess, Plan)",
        rhythm: "Monthly",
        summary:
          "The monthly checkpoint that catches execution drift between quarterly reviews.",
        description:
          "A half-day monthly checkpoint — data, reflection, and planning — that keeps OKR owners accountable between quarterly reviews. It's where execution drift gets caught early, before a strategy that looked clear at the Execution Workshop quietly loses momentum in the day-to-day.",
        atlLink: { label: "MRAP — Above The Line", href: "/mrap" },
      },
      {
        id: "org-structure-workshop",
        name: "Organizational Structure Workshop",
        rhythm: "Once-off",
        summary:
          "Rebuilds roles and reporting lines around the structure the business actually needs to scale.",
        description:
          "A practical design workshop that rebuilds roles, reporting lines, and accountability around the structure the business actually needs to scale — not the one it grew by accident. It draws on Contribution Compass team data so structural decisions reflect real capability, de-risking the next OKR cycle by putting decision rights in the right hands.",
      },
      {
        id: "performance-management-workshop",
        name: "Performance Management Workshop",
        rhythm: "Once-off",
        summary:
          "Rebuilds performance reviews around the OKRs and role clarity set in the Execution Workshop.",
        description:
          "A one-to-two day programme that rebuilds performance reviews around the OKRs and role clarity set in the Execution Workshop, turning a once-a-year formality into a genuine tool for clarity, accountability, and motivation — connecting individual performance conversations back to the company's execution rhythm.",
      },
      {
        id: "performance-management-coaching",
        name: "Performance Management 6-Month Coaching",
        rhythm: "6-Month Coaching",
        summary:
          "Six months of coaching that embeds the Performance Management Workshop into daily practice.",
        description:
          "Six months of ongoing coaching that embeds the Performance Management Workshop's system into daily management practice, so managers keep running real performance conversations long after the workshop energy fades — the difference between a policy on paper and one the business actually uses.",
      },
      {
        id: "starter-kit-full",
        name: "Post Execution Workshop Starter Kit — Activation & Group Training",
        rhythm: "Annual",
        summary:
          "The structured follow-through that stops the Execution Workshop's Blueprint and OKRs from being filed away and forgotten.",
        description:
          "The structured follow-through after the Execution Workshop — group activation training plus ongoing support through the year — built specifically to stop the Blueprint, OKRs, and Balanced Scorecard from being filed away and forgotten. It's the bridge between a well-run workshop and a system the business actually runs on.",
      },
      {
        id: "starter-kit-lite",
        name: "Post Execution Workshop Starter Kit — Lite",
        rhythm: "Annual (Lite)",
        summary:
          "A lighter-touch version of the Starter Kit follow-through, for a lower cost and time commitment.",
        description:
          "A lighter-touch version of the Starter Kit follow-through, for businesses that need the execution system embedded but at a lower cost and time commitment than the full activation programme — still enough structure to stop the Execution Workshop's output going stale.",
      },
    ],
  },
  {
    id: "culture",
    name: "Culture",
    tagline: "How the business actually behaves, day to day.",
    color: "#C97B4A",
    items: [
      {
        id: "culture-workshop",
        name: "Culture Workshop",
        rhythm: "Annual",
        summary:
          "Defines the company's values in behavioural terms, then tests every year whether they're actually being lived.",
        description:
          "In Year 1, translates strategy into 'how we work' by defining 3-5 core values in observable behavioural terms — what they look like and don't look like in practice — and finalising them in a Company Constitution, surfacing the cultural inhibitors currently limiting execution and building leadership trust and a shared language so daily behaviour is aligned to the strategy just committed to in the Growth Strategy and Execution Workshops. In later years, it becomes the Annual Culture Workshop, using the 10X Culture & Engagement X-Ray results to test whether the values agreed in Year 1 are actually being lived as the team grows — reinforcing what's working, resetting what's drifted, and feeding outputs into the quarterly review rhythm so culture stays a measurable, living system rather than a poster on the wall.",
      },
      {
        id: "culture-xray",
        name: "10X Culture & Employment Engagement X-Ray & Debrief",
        rhythm: "Once-off",
        summary:
          "A company-wide culture and engagement survey that gives the Culture Workshop a real evidence base.",
        description:
          "A company-wide culture and engagement survey, benchmarked and debriefed with leadership before the Culture Workshop. It gives an evidence base — not just gut feel — for where culture is helping or hurting performance, so the workshop agenda targets the business's real inhibitors rather than generic values language.",
      },
      {
        id: "contribution-compass-reports",
        name: "Contribution Compass Team Reports",
        rhythm: "Once-off",
        summary:
          "Profiles each team member's energy mix and flow, feeding directly into the Organizational Structure Workshop.",
        description:
          "Profiles each team member's natural energy mix across four dimensions — Activating, Inspiring, Sustaining, Refining — and rolls it up into a team-level flow score. It shows leadership exactly where imbalance is creating friction or blind spots, so hiring, role design, and restructuring decisions are based on evidence rather than instinct, directly informing the Organizational Structure Workshop and A-Team Assessment.",
      },
      {
        id: "game-changing-culture",
        name: "Game Changing Culture — Contribution Compass + Tablestand",
        rhythm: "Once-off",
        summary:
          "Turns Contribution Compass profiles into a shared, working language the whole team keeps using.",
        description:
          "Bundles individual Contribution Compass profiles with printed reference tablestands so the whole team can see and discuss each other's energy profile live in the room. It turns a psychometric report into a shared, working language the team keeps using long after the workshop ends — reinforcing the culture and structure decisions made elsewhere in the programme.",
      },
      {
        id: "a2b-tlc-module-1",
        name: "A2B TLC Module 1",
        rhythm: "Once-off",
        summary:
          "The entry point of BGC's change-leadership series, qualifying leaders to drive the shifts coming out of the workshops.",
        description:
          "Module 1 of BGC's neuroscience-based A2B change-leadership series, building the self-awareness a leader needs before asking anyone else to change. It's the entry point that qualifies leaders to act as internal change agents for the culture and execution shifts coming out of the workshops.",
      },
      {
        id: "hardwires-assessment",
        name: "Hardwires Assessment",
        rhythm: "Once-off",
        summary:
          "Surfaces a leader's unconscious default responses to change — the evidence base the A2B series works from.",
        description:
          "An individual neuro-behavioural diagnostic that surfaces a leader's default, often unconscious, responses to change — the patterns that help or sabotage them under pressure. It's the evidence base the A2B series works from, and often explains why an otherwise capable leader struggles to drive a specific culture or execution shift.",
      },
      {
        id: "leadership-360",
        name: "Leadership 360° & Personal Development Plan",
        rhythm: "Once-off",
        summary:
          "Closes the gap between how a leader sees themselves and how the business actually experiences them.",
        description:
          "A comprehensive 360° feedback assessment — peers, direct reports, manager — translated into a personalised development plan with a debrief and ongoing mentoring support. It closes the gap between how a leader sees themselves and how the business actually experiences them, usually the real blocker behind culture and execution issues workshops alone can't fix.",
      },
    ],
  },
];
