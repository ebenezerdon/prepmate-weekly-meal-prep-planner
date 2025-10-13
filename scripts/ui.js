/* ui.js - builds UI, handles events, renders planner
   Responsibilities:
   - Define window.App with init and render methods
   - Maintain in-memory state and sync with App.Storage
   - Render dishes list, week grid, assignment modal, and summaries
*/

(function(win, $){
  'use strict';
  win.App = win.App || {};

  // local state will be synced to storage
  const State = {
    dishes: [],
    plan: {},
    settings: { autoBalance: true }
  };

  // DOM selectors cached
  const DOM = {};

  // Small helper: create a dish pill HTML
  function dishPillHtml(d){
    const safeName = $('<div>').text(d.name).html();
    return `<span class="dish-pill" style="background:${d.color};">${safeName}</span>`;
  }

  // Render dish library
  function renderDishes(){
    const $list = DOM.dishList.empty();
    if (!State.dishes.length){
      $list.append('<div class="text-sm text-gray-500">No dishes yet. Add one!</div>');
      return;
    }
    State.dishes.forEach(d => {
      const $row = $(`<div class="flex items-center justify-between"></div>`);
      const $left = $(`<div class=\"flex items-center gap-3\"></div>`);
      $left.append($(`<div style=\"width:36px;height:36px;border-radius:8px;background:${d.color};color:white;display:flex;align-items:center;justify-content:center;font-weight:700;\">${d.name.charAt(0)}</div>`));
      $left.append($(`<div><div class=\"font-medium\">${d.name}</div><div class=\"text-xs text-gray-500\">Makes ${d.servings} servings</div></div>`));
      const $right = $(`<div class=\"flex items-center gap-2\"></div>`);
      const $use = $(`<button class=\"btn-muted\" data-id=\"${d.id}\">Use</button>`);
      $use.on('click', () => openAssignForDish(d.id));
      const $del = $(`<button class=\"text-sm text-rose-600\">Delete</button>`);
      $del.on('click', () => { if (confirm('Delete dish? This will remove it from the library.')){ removeDish(d.id); } });
      $right.append($use).append($del);
      $row.append($left).append($right);
      $list.append($row);
    });
  }

  // Render week grid
  function renderWeek(){
    const DAYS = window.App.Utils.DAYS;
    const MEALS = window.App.Utils.MEALS;
    const $container = DOM.weekGrid.empty();

    const $table = $('<table class="min-w-full"></table>');
    // header: days
    const $thead = $('<thead></thead>');
    const $trh = $('<tr></tr>');
    $trh.append('<th class="p-2 text-sm text-left"></th>');
    DAYS.forEach(d => { $trh.append(`<th class="p-2 text-sm text-left">${d}</th>`); });
    $thead.append($trh);
    $table.append($thead);

    const $tbody = $('<tbody></tbody>');
    MEALS.forEach(meal => {
      const $tr = $('<tr></tr>');
      $tr.append(`<th class="p-2 align-top text-sm font-medium">${meal}</th>`);
      DAYS.forEach(day => {
        const key = `${day}-${meal}`;
        const entry = State.plan[key];
        const $td = $(`<td class="p-2 align-top"><div class=\"slot\" data-key=\"${key}\"></div></td>`);
        const $slot = $td.find('.slot');
        if (entry && entry.dishId){
          const dish = State.dishes.find(x => x.id === entry.dishId);
          if (dish){
            const used = entry.servings || 1;
            const pill = $(`<div class=\"dish-pill\" style=\"background:${dish.color};\">${dish.name}<span style=\"font-size:11px;opacity:0.9;margin-left:8px;font-weight:600;\">×${used}</span></div>`);
            $slot.append(pill);
            // left-over indicator: compute remaining if any
            const totalServings = dish.servings;
            // compute used across all plan
            const usedAll = computeUsedForDish(dish.id);
            const remaining = Math.max(0, totalServings - usedAll);
            if (remaining > 0){
              $slot.append(`<div class=\"dish-leftover mt-2\">${remaining} leftover(s)</div>`);
            }
          } else {
            $slot.append('<div class="text-sm text-gray-500">(missing dish)</div>');
          }
        } else {
          $slot.append('<div class="text-sm text-gray-400">Empty</div>');
        }
        // click interaction
        $slot.on('click', function(){ openAssignForSlot(key); });
        $tr.append($td);
      });
      $tbody.append($tr);
    });
    $table.append($tbody);
    $container.append($table);
  }

  function computeUsedForDish(dishId){
    let total = 0;
    Object.values(State.plan || {}).forEach(e => { if (e && e.dishId === dishId) total += (e.servings || 1); });
    return total;
  }

  function renderSummary(){
    const left = window.App.Utils.computeLeftovers(State).leftovers;
    const $leftList = DOM.leftoversList.empty();
    if (!left.length){ $leftList.text('No leftovers'); }
    else {
      left.forEach(l => { $leftList.append(`<div>${l.name} — ${l.remaining} leftover(s)</div>`); });
    }
    // servings summary
    const totalPlanned = Object.values(State.plan).reduce((s,e) => s + (e && e.servings? e.servings : 0), 0);
    DOM.servingsSummary.text(`${totalPlanned} servings planned`);
  }

  function syncToStorage(){
    const toSave = { dishes: State.dishes, plan: State.plan, settings: State.settings };
    window.App.Storage.save(toSave);
  }

  // Actions: add, remove, assign, clear
  function addDish(name, servings, color){
    const newDish = { id: window.App.Utils.uid(), name: name.trim(), servings: Number(servings) || 1, color: color || '#34D399' };
    State.dishes.push(newDish);
    syncToStorage();
    renderAll();
    return newDish;
  }

  function removeDish(id){
    State.dishes = State.dishes.filter(d => d.id !== id);
    // remove from plan
    Object.keys(State.plan).forEach(k => { if (State.plan[k] && State.plan[k].dishId === id) delete State.plan[k]; });
    syncToStorage();
    renderAll();
  }

  function openAssignForSlot(key){
    DOM.assignModal.show();
    DOM.assignModal.data('targetKey', key);
    // preselect meal
    const meal = key.split('-')[1];
    DOM.assignMeal.val(meal);
    populateAssignDishSelect();
  }

  function openAssignForDish(dishId){
    DOM.assignModal.show();
    DOM.assignModal.data('targetKey', null);
    populateAssignDishSelect(dishId);
  }

  function populateAssignDishSelect(preselectId){
    DOM.assignDish.empty();
    DOM.assignDish.append('<option value="">-- choose dish --</option>');
    State.dishes.forEach(d => {
      const opt = $(`<option value=\"${d.id}\">${d.name} (makes ${d.servings})</option>`);
      DOM.assignDish.append(opt);
    });
    if (preselectId){ DOM.assignDish.val(preselectId); }
  }

  function assignToTarget(){
    const dishId = DOM.assignDish.val();
    const servings = parseInt(DOM.assignServings.val(),10) || 1;
    const meal = DOM.assignMeal.val();
    const targetKey = DOM.assignModal.data('targetKey');
    if (!dishId){ alert('Select a dish'); return; }
    if (servings < 1){ alert('Servings must be at least 1'); return; }

    if (targetKey){
      State.plan[targetKey] = { dishId, servings };
    } else {
      // user opened from dish list: ask where to assign — find first empty slot of selected meal
      const DAYS = window.App.Utils.DAYS;
      let assigned = false;
      for (let i=0;i<DAYS.length && !assigned;i++){
        const key = `${DAYS[i]}-${meal}`;
        if (!State.plan[key] || !State.plan[key].dishId){
          State.plan[key] = { dishId, servings };
          assigned = true;
        }
      }
      if (!assigned){ alert('No empty slots available for that meal. Choose a specific slot.'); }
    }

    DOM.assignModal.hide();
    // optionally auto-balance leftovers
    applyAutoBalanceIfNeeded();
    syncToStorage();
    renderAll();
  }

  function applyAutoBalanceIfNeeded(){
    if (State.settings.autoBalance){
      State.plan = window.App.Utils.autoBalance(State);
    }
  }

  function clearWeek(){
    if (!confirm('Clear all assigned meals for the week?')) return;
    State.plan = {};
    syncToStorage();
    renderAll();
  }

  function exportPlan(){
    const data = JSON.stringify({ dishes: State.dishes, plan: State.plan }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'prepmate-plan.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // Public init/render
  win.App.init = function(){
    // cache DOM
    DOM.dishList = $('#dishList');
    DOM.weekGrid = $('#weekGrid');
    DOM.leftoversList = $('#leftoversList');
    DOM.servingsSummary = $('#servingsSummary');
    DOM.planNotes = $('#planNotes');
    DOM.addDishBtn = $('#addDishBtn');
    DOM.dishForm = $('#dishForm');
    DOM.dishName = $('#dishName');
    DOM.dishServings = $('#dishServings');
    DOM.dishColor = $('#dishColor');
    DOM.saveDish = $('#saveDish');
    DOM.cancelDish = $('#cancelDish');
    DOM.assignModal = $('#assignModal');
    DOM.assignDish = $('#assignDish');
    DOM.assignServings = $('#assignServings');
    DOM.assignMeal = $('#assignMeal');
    DOM.assignSave = $('#assignSave');
    DOM.assignCancel = $('#assignCancel');
    DOM.clearWeek = $('#clearWeek');
    DOM.exportPlan = $('#exportPlan');
    DOM.toggleAuto = $('#toggleAutoBalance');

    // load storage
    const stored = window.App.Storage.load();
    State.dishes = stored.dishes || [];
    State.plan = stored.plan || {};
    State.settings = stored.settings || { autoBalance: true };
    DOM.toggleAuto.prop('checked', !!State.settings.autoBalance);

    // event wiring
    DOM.addDishBtn.on('click', () => { DOM.dishForm.show(); DOM.dishForm.attr('aria-hidden', 'false'); });
    DOM.cancelDish.on('click', () => { DOM.dishForm.hide(); DOM.dishForm.attr('aria-hidden', 'true'); });
    DOM.saveDish.on('click', () => {
      const name = DOM.dishName.val() || '';
      const servings = parseInt(DOM.dishServings.val(),10) || 1;
      const color = DOM.dishColor.val() || '#34D399';
      if (!name.trim()){ alert('Dish name required'); return; }
      addDish(name, servings, color);
      DOM.dishForm.hide(); DOM.dishForm.attr('aria-hidden', 'true');
      DOM.dishName.val(''); DOM.dishServings.val('4');
    });

    DOM.assignSave.on('click', assignToTarget);
    DOM.assignCancel.on('click', function(){ DOM.assignModal.hide(); });

    DOM.clearWeek.on('click', clearWeek);
    DOM.exportPlan.on('click', exportPlan);

    DOM.toggleAuto.on('change', function(){ State.settings.autoBalance = $(this).is(':checked'); syncToStorage(); applyAutoBalanceIfNeeded(); renderAll(); });

    // small helpers for modal show/hide
    DOM.assignModal.show = function(){ DOM.assignModal.removeClass('hidden').css('display','flex'); DOM.assignModal.attr('aria-hidden','false'); };
    DOM.assignModal.hide = function(){ DOM.assignModal.addClass('hidden').css('display','none'); DOM.assignModal.attr('aria-hidden','true'); };

    // top-level buttons
    $('#clearWeek').on('click', clearWeek);
    $('#exportPlan').on('click', exportPlan);

    // set initial render
    renderAll();
  };

  win.App.render = function(){
    // intentionally simple: re-render everything
    renderDishes();
    renderWeek();
    renderSummary();
    // update notes
    DOM.planNotes.text('Plan saved locally');
  };

  // small helper to re-render both
  function renderAll(){
    win.App.render();
    syncToStorage();
  }

  // attach some functions onto App for debugging and use from other modules
  win.App.addDish = addDish;
  win.App.removeDish = removeDish;
  win.App.clearWeek = clearWeek;
  win.App.exportPlan = exportPlan;

})(window, jQuery);
