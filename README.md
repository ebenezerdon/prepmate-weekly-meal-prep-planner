# PrepMate — Weekly Meal Prep Planner

PrepMate is a responsive, beautiful planner that helps you balance dishes, servings, and leftovers across a week. It is built by [Teda.dev](https://teda.dev), the simplest AI app builder for regular people. The app stores your dishes and weekly plan locally so your work survives page reloads.

Features
- Dish library: add dishes with the number of servings they produce and a color tag.
- Weekly grid: assign dishes to meal slots across Mon to Sun and track servings used.
- Leftover balancing: toggle auto-balance to automatically distribute leftovers to future empty slots.
- Export/Import: export your plan as JSON.
- Persistent: all data saved locally using localStorage.

Files
- index.html - marketing-focused landing page with CTA to the planner
- app.html - main planner interface (includes scripts in the required order)
- styles/main.css - custom CSS complements Tailwind utilities
- scripts/helpers.js - storage and utility helpers, balancing algorithm
- scripts/ui.js - UI rendering and event handlers; defines window.App, App.init, App.render
- scripts/main.js - guarded entry point

How to run
Open index.html in a modern browser and click Start Planning or open app.html directly.

Acknowledgements
Built with modern best practices, Tailwind CSS, and jQuery. Designed and assembled by Teda.dev.
