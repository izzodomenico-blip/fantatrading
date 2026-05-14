\---

name: frontend-design

description: Use this skill when improving the visual design, UX, layout, typography, responsive behavior, component hierarchy, dashboard clarity, charts, tables, forms, and product polish of the FantaTrading web app. This skill must not change backend logic, formulas, business rules, payments, payout logic, or the FAVC model.

\---



\# Frontend Design Skill — FantaTrading



Use this skill to improve the FantaTrading frontend as a premium fintech/sport-trading web app.



\## Non-negotiable constraints



Do not modify:

\- backend business logic;

\- core formulas;

\- FAVC model;

\- payout/payment logic;

\- database schema unless explicitly requested;

\- real-money behavior;

\- validated calculations;

\- endpoint contracts unless explicitly requested.



Never introduce:

\- real payments;

\- real payout;

\- financial redemption language;

\- ambiguous “credito reale” wording.



Always preserve:

\- pilot virtuale;

\- capitale virtuale;

\- nessun payout reale;

\- ranking ROI%;

\- settlement virtuale;

\- buy commission 2%;

\- sell commission 1.25%;

\- team composition 3 GK / 8 DEF / 8 MID / 6 FWD.



\## Product identity



FantaTrading should feel like:

\- fantasy football + stock trading;

\- sport fintech dashboard;

\- premium dark-mode product;

\- clear enough for a non-technical user.



Use clear Italian product language.



Prefer:

\- “capitale virtuale”;

\- “budget residuo”;

\- “valore rosa”;

\- “guadagno/perdita”;

\- “guadagno %”;

\- “simulazione storica”;

\- “nessun pagamento reale”;

\- “settlement virtuale”.



Avoid unclear words:

\- “riscossione” without “virtuale”;

\- “credito” without “virtuale”;

\- “ROI” as the only visible label for normal users;

\- “payout” unless saying “nessun payout reale”.



\## Design system



Style direction:

\- dark mode premium;

\- fintech/sport trading feel;

\- clean dashboards;

\- strong numeric hierarchy;

\- visible but not noisy badges;

\- soft cards;

\- clear spacing;

\- responsive mobile/tablet/desktop.



Use consistent visual hierarchy:

\- Page title;

\- short subtitle;

\- status badges;

\- primary KPI cards;

\- secondary cards/tables;

\- details/drawers.



\## Layout rules



For complex pages, separate intent clearly:

\- Overview: only summary.

\- Mercato: players to buy.

\- Rosa: active team.

\- Crea squadra: guided builder.

\- Simulazione stagione: historical replay.

\- Operazioni: transactions and simulation.

\- Settlement: final virtual closure.



Avoid placing too many tables and cards on one screen.



Use:

\- tabs;

\- two-column layout where useful;

\- sticky summary panels;

\- progressive disclosure;

\- drawers for details;

\- empty states.



\## Typography



Improve readability:

\- bigger KPI values;

\- short labels;

\- avoid tiny text for important numbers;

\- line-height comfortable;

\- section titles obvious;

\- table headers readable.



\## Player cards



PlayerCard should show:

\- real player name;

\- role;

\- club;

\- current quote;

\- quote delta;

\- trend badge;

\- mini sparkline;

\- primary action.



Avoid overcrowding cards.



For compact cards:

\- no axes;

\- no markers;

\- small sparkline only;

\- show last value and delta.



For detail drawer:

\- larger chart;

\- clean tooltip;

\- round-by-round table;

\- votes/SV/bonus information.



\## Charts



Avoid ECG effect:

\- no marker on every point;

\- use smooth simple lines;

\- show markers only for first, last, max, min, or quote-change points;

\- add toggles: ultime 5, ultime 10, tutte;

\- keep tooltips readable;

\- distinguish:

&#x20; - quote synthetic;

&#x20; - real votes;

&#x20; - estimated values.



\## Team creation UX



The team builder must be clear:



Step 1: Capitale iniziale  

Step 2: Scelta giocatori  

Step 3: Riepilogo rosa  

Step 4: Salva rosa e avvia simulazione



Always show:

\- season 2025/26;

\- capital selected;

\- players selected;

\- composition 3/8/8/6;

\- quote cost;

\- 2% buy commission;

\- total cost;

\- residual budget;

\- extra virtual capital required;

\- no real payment note.



Final button wording:

“SALVA ROSA E AVVIA SIMULAZIONE”



\## Season simulation UX



The simulation should clearly answer:

\- Which team am I simulating?

\- Which round am I on?

\- What changed this round?

\- Who made me gain?

\- Who made me lose?

\- What did I spend?

\- What is my current team value?

\- What is my residual budget?

\- What is my progressive profit/loss?



Primary KPI labels:

\- Capitale iniziale;

\- Speso giocatori;

\- Commissioni;

\- Budget residuo;

\- Valore rosa;

\- Guadagno/Perdita;

\- Guadagno %.



ROI can be shown secondarily as “Guadagno % / ROI”.



Always include:

\- activeTeamId info in dev/info panel;

\- clear “La mia simulazione”;

\- separate “Confronto demo multi-squadra”.



\## Tables



Improve tables:

\- aligned numeric columns;

\- sticky or clear headers where useful;

\- subtle row hover;

\- positive/negative values visually distinct;

\- responsive horizontal scroll;

\- avoid too many columns in mobile.



\## Badges



Standardize badges:

\- Backend collegato;

\- Demo backend;

\- Trend synthetic;

\- Voti reali;

\- Capitale virtuale;

\- Nessun payout reale;

\- Squadra attiva;

\- Modalità mock.



Badges should be visually consistent.



\## Empty states



Every empty/missing state must say what to do:

\- “Crea o seleziona prima una rosa.”

\- “Nessuna operazione registrata.”

\- “Backend non disponibile: modalità demo mock.”

\- “Nessun dato voto per questa giornata.”



\## Accessibility



Keep:

\- good contrast;

\- visible focus states;

\- buttons clearly disabled/enabled;

\- no important meaning by color only;

\- text readable on dark background.



\## Required checks before finishing



Run:

\- npm.cmd run web:build

\- npm.cmd test

\- npm.cmd run backend:build

\- npm.cmd run backend:test



Final response must include:

\- pages improved;

\- files changed;

\- build/test results;

\- what to check in browser;

\- any remaining limitations.

