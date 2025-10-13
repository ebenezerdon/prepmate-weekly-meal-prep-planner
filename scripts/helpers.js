/* helpers.js - utilities and storage helpers for PrepMate
   Responsibilities:
   - Provide localStorage wrappers
   - Provide constants (days, meals)
   - Provide balancing algorithm helper
*/

(function(win, $){
  'use strict';
  win.App = win.App || {};

  const StorageKey = 'prepMate:v1';

  function safeParse(v){
    try { return JSON.parse(v); } catch(e){ return null; }
  }

  function loadState(){
    const raw = window.localStorage.getItem(StorageKey);
    return safeParse(raw) || { dishes: [], plan: {}, settings: { autoBalance: true } };
  }

  function saveState(state){
    try {
      window.localStorage.setItem(StorageKey, JSON.stringify(state));
      return true;
    } catch(e){
      console.error('Save failed', e);
      return false;
    }
  }

  function uid(){
    return 'd_' + Math.random().toString(36).slice(2,9);
  }

  const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const MEALS = ['Breakfast','Lunch','Dinner'];

  // Compute leftovers and optionally auto-assign leftovers into future empty slots.
  // state: {dishes, plan} where dishes: [{id,name,servings,remaining?}] plan: { 'Mon-Breakfast': {dishId,servings}, ... }
  function computeLeftovers(state){
    const dishesCopy = state.dishes.map(d => ({ ...d, remaining: (d.remaining != null ? d.remaining : d.servings) }));
    // subtract used servings from plan
    Object.keys(state.plan || {}).forEach(key => {
      const entry = state.plan[key];
      if (!entry || !entry.dishId) return;
      const dd = dishesCopy.find(x => x.id === entry.dishId);
      if (dd){ dd.remaining = Math.max(0, dd.remaining - (entry.servings || 1)); }
    });
    // create leftovers list
    const leftovers = dishesCopy.filter(d => d.remaining > 0).map(d => ({ id: d.id, name: d.name, remaining: d.remaining }));
    return { dishesCopy, leftovers };
  }

  // Auto-balance algorithm: try to push leftovers into the next available same-meal slots.
  // It mutates a shallow copy of plan and returns newPlan.
  function autoBalance(state){
    const plan = Object.assign({}, state.plan || {});
    const { dishesCopy } = computeLeftovers(state);
    // Map days as indices for ordering
    const dayIndex = (d) => DAYS.indexOf(d);

    // For each dish with remaining, try filling future same-meal slots that are empty.
    dishesCopy.forEach(dish => {
      let remaining = dish.remaining;
      if (remaining <= 0) return;
      // search days in order Mon..Sun
      for (let di=0; di<DAYS.length && remaining>0; di++){
        for (let mi=0; mi<MEALS.length && remaining>0; mi++){
          const key = `${DAYS[di]}-${MEALS[mi]}`;
          const cell = plan[key];
          // only fill if empty
          if (!cell || !cell.dishId){
            // assign 1 serving (or all remaining if user prefers)
            const use = Math.min(remaining, 1);
            plan[key] = { dishId: dish.id, servings: use };
            remaining -= use;
          }
        }
      }
    });
    return plan;
  }

  // Provide some sample dishes when user is new
  function getSampleState(){
    return {
      dishes: [
        { id: uid(), name: 'Roast Chicken', servings: 6, color: '#F97316' },
        { id: uid(), name: 'Veggie Pasta', servings: 4, color: '#10B981' },
        { id: uid(), name: 'Hearty Salad', servings: 2, color: '#06B6D4' }
      ],
      plan: {},
      settings: { autoBalance: true }
    };
  }

  // Expose helpers under window.App.Storage and window.App.Utils
  win.App.Storage = {
    load: function(){
      const s = loadState();
      // if empty, return sample data
      if (!s.dishes || !s.dishes.length){
        const sample = getSampleState();
        saveState(sample);
        return sample;
      }
      return s;
    },
    save: function(state){
      return saveState(state);
    },
    clear: function(){
      window.localStorage.removeItem(StorageKey);
    }
  };

  win.App.Utils = {
    DAYS, MEALS, uid, computeLeftovers, autoBalance
  };

})(window, jQuery);
