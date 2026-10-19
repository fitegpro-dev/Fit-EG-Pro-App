/* ===== FiT EG Pro | إضافات: بحث شامل + وصفات + رسم أسبوعي + زرار ماسنجر عائم ===== */
(function () {
  const MESSENGER = 'https://m.me/61576464833845';

  /* ---------- الوصفات: عدّلها من هنا (url فاضي = الزرار مش هيظهر) ---------- */
  const RECIPE_TABS = { breakfast: 'فطار', lunch: 'غدا', snack: 'سناك' };
  const RECIPES = [
    // [التاب, الاسم, سعرات, بروتين, كارب, دهون, الرابط]
    ['breakfast', 'أومليت 3 بيضات مع خضار وعيش توست', 380, 26, 24, 20, ''],
    ['breakfast', 'زبادي يوناني مع شوفان وموز', 340, 24, 48, 6, ''],
    ['breakfast', 'فول بالزيت الحار وبيضة مسلوقة', 360, 22, 38, 13, ''],
    ['lunch', 'فراخ مشوية مع رز بسمتي وسلطة', 550, 45, 60, 12, ''],
    ['lunch', 'سمك مشوي مع بطاطس فرن وخضار', 520, 42, 45, 18, ''],
    ['lunch', 'كفتة مشوية مع رز وسلطة خضرا', 600, 40, 58, 22, ''],
    ['snack', 'تونة مع خيار وعيش بلدي', 220, 24, 20, 4, ''],
    ['snack', 'جبنة قريش مع طماطم وخيار', 160, 22, 8, 4, ''],
    ['snack', 'حفنة لوز مع تفاحة', 230, 6, 26, 12, '']
  ];

  /* ---------- ستايل ---------- */
  const st = document.createElement('style');
  st.textContent = `
    .fab-msg{position:fixed;left:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:55;width:56px;height:56px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;color:#fff;background:linear-gradient(135deg,#7c6cff,#4f8cff);
      box-shadow:0 10px 24px rgba(109,93,252,.4);transition:transform .2s}
    .fab-msg:hover{transform:scale(1.07)}
    .fab-msg svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
    .rc-card{padding:14px;border-radius:16px;background:#fff;border:1px solid var(--line)}
  `;
  document.head.appendChild(st);

  /* ---------- 4) ماسنجر عائم ---------- */
  const fab = document.createElement('a');
  fab.className = 'fab-msg';
  fab.href = MESSENGER; fab.target = '_blank'; fab.rel = 'noopener noreferrer';
  fab.setAttribute('aria-label', 'تواصل معنا على ماسنجر');
  fab.innerHTML = '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  document.body.appendChild(fab);

  const _init = initTracker;
  initTracker = async function () {
    await _init();
    const a = document.getElementById('messenger-link');
    if (a) { a.href = MESSENGER; a.classList.remove('hidden'); }
  };

  /* ---------- 1) البحث الشامل: جدولك أولاً ثم Open Food Facts ---------- */
  window.__offFoods = {};
  let searchTok = 0, searchTimer = null;

  async function searchOFF(q) {
    const url = 'https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=10' +
      '&fields=product_name,product_name_ar,brands,nutriments&search_terms=' + encodeURIComponent(q);
    const r = await fetch(url);
    if (!r.ok) throw new Error('OFF ' + r.status);
    const j = await r.json();
    const out = [];
    (j.products || []).forEach((p, i) => {
      const n = p.nutriments || {};
      const name = (p.product_name_ar || p.product_name || '').trim();
      let kcal = Number(n['energy-kcal_100g']);
      if (!kcal && n['energy_100g']) kcal = Number(n['energy_100g']) / 4.184;
      if (!name || !(kcal > 0)) return;
      out.push({
        id: 'off_' + i, food_name: name + (p.brands ? ' (' + p.brands.split(',')[0].trim() + ')' : ''),
        serving: '100 جرام (قيم تقريبية)',
        calories: Math.round(kcal), protein: r1(n['proteins_100g']), carbs: r1(n['carbohydrates_100g']), fats: r1(n['fat_100g'])
      });
    });
    return out.slice(0, 6);
  }

  renderMealResults = function () {
    const q = (document.getElementById('meal-search').value || '').trim();
    const box = document.getElementById('meal-results');
    clearTimeout(searchTimer);
    const tok = ++searchTok;
    if (!q) { box.innerHTML = ''; return; }
    if (!allFoods.length) { box.innerHTML = '<p class="text-xs" style="color:var(--ink2)">الأطعمة لسه بتتحمّل...</p>'; return; }

    const local = allFoods.filter(f => matchFood(f.food_name, q)).slice(0, 6);
    const localHtml = local.map(f => `
      <button type="button" data-add="${esc(f.id)}" class="text-right p-3 rounded-2xl flex items-center justify-between gap-3" style="border:1px solid var(--line);background:#fff;font-family:inherit">
        <span class="min-w-0"><span class="block font-extrabold text-sm">${esc(f.food_name)}</span><span class="block text-[11px]" style="color:var(--ink2)">${esc(f.serving)}</span></span>
        <span class="chip flex-shrink-0">${esc(Number(f.calories))} سعرة</span>
      </button>`).join('');
    box.innerHTML = localHtml;
    if (local.length >= 4 || q.length < 2) return;

    box.innerHTML = localHtml + '<p class="text-xs py-2" style="color:var(--ink2)">بندوّر في الإنترنت...</p>';
    searchTimer = setTimeout(async () => {
      let extra = [], failed = false;
      try { extra = await searchOFF(q); } catch (e) { console.error(e); failed = true; }
      if (tok !== searchTok) return;
      extra.forEach(f => { window.__offFoods[f.id] = f; });
      const extraHtml = extra.map(f => `
        <button type="button" data-addoff="${esc(f.id)}" class="text-right p-3 rounded-2xl flex items-center justify-between gap-3" style="border:1px dashed #cfc9fb;background:#fff;font-family:inherit">
          <span class="min-w-0"><span class="block font-extrabold text-sm">${esc(f.food_name)}</span><span class="block text-[11px]" style="color:var(--ink2)">${esc(f.serving)}</span></span>
          <span class="chip flex-shrink-0">${esc(f.calories)} سعرة</span>
        </button>`).join('');
      const head = extra.length ? '<p class="text-[11px] font-bold pt-2" style="color:var(--ink2)">نتائج من الإنترنت (Open Food Facts)، القيم تقريبية</p>' : '';
      const none = !local.length && !extra.length
        ? `<p class="text-xs" style="color:var(--ink2)">${failed ? 'تعذّر البحث في الإنترنت.' : 'ما لقيتش "' + esc(q) + '".'} جرّب كلمة تانية أو أضفها بنفسك.</p>` : '';
      box.innerHTML = localHtml + head + extraHtml + none;
    }, 450);
  };

  document.addEventListener('click', ev => {
    const a = ev.target.closest('[data-addoff]');
    if (a && window.__offFoods[a.dataset.addoff]) openAddModal(window.__offFoods[a.dataset.addoff]);
    const rc = ev.target.closest('[data-recipe]');
    if (rc) {
      const r = RECIPES[+rc.dataset.recipe];
      openAddModal({ food_name: r[1], serving: 'وجبة واحدة', calories: r[2], protein: r[3], carbs: r[4], fats: r[5] });
    }
    const t = ev.target.closest('[data-rtab]');
    if (t) { recipeTab = t.dataset.rtab; renderRecipes(); }
  });

  /* ---------- 2) وصفات وأفكار أكل صحي ---------- */
  let recipeTab = 'breakfast';
  const guide = document.getElementById('food-search').closest('.card');
  const rsec = document.createElement('div');
  rsec.className = 'card p-5 sm:p-7';
  guide.insertAdjacentElement('afterend', rsec);

  function renderRecipes() {
    const items = RECIPES.map((r, i) => ({ r, i })).filter(x => x.r[0] === recipeTab);
    rsec.innerHTML = `
      <h3 class="font-black text-base">وصفات وأفكار أكل صحي</h3>
      <p class="text-xs mb-3" style="color:var(--ink2)">اختار فكرة وسجّلها بضغطة، أو افتح الطريقة.</p>
      <div class="flex gap-2 mb-3">${Object.keys(RECIPE_TABS).map(k =>
        `<button type="button" class="cat-chip ${k === recipeTab ? 'active' : ''}" data-rtab="${k}">${RECIPE_TABS[k]}</button>`).join('')}</div>
      <div class="grid sm:grid-cols-2 gap-3">${items.map(({ r, i }) => `
        <div class="rc-card">
          <div class="font-extrabold text-sm">${esc(r[1])}</div>
          <div class="text-[11px] mt-1" style="color:var(--ink2)">${r[2]} سعرة · بروتين ${r[3]} / كارب ${r[4]} / دهون ${r[5]} (تقريبي)</div>
          <div class="flex gap-2 mt-3">
            <button type="button" class="btn btn-primary btn-sm" data-recipe="${i}">سجّلها</button>
            ${r[6] ? `<a class="btn btn-out btn-sm" href="${esc(r[6])}" target="_blank" rel="noopener noreferrer">شوف الطريقة</a>` : ''}
          </div>
        </div>`).join('')}</div>`;
  }
  renderRecipes();

  /* ---------- 3) زرار إنهاء اليوم + رسم أسبوعي ---------- */
  const todayCard = document.getElementById('today-card');
  const wk = document.createElement('div');
  wk.className = 'card p-5 sm:p-7';
  todayCard.insertAdjacentElement('afterend', wk);

  function renderWeekly() {
    const days = [], now = parseYmd(todayStr());
    for (let i = 6; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); days.push(d); }
    const col = { green: '#22c55e', yellow: '#f59e0b', red: '#ef4444' };
    const rows = days.map(d => ({ d, c: closures[ymd(d)] }));
    const max = Math.max(1, ...rows.map(x => Math.max(x.c ? +x.c.calories : 0, x.c ? +x.c.target_calories : (targets ? targets.cals : 0))));
    const H = 120, W = 300, bw = 26, gap = (W - bw * 7) / 6;
    const bars = rows.map((x, i) => {
      const xx = i * (bw + gap), h = x.c ? Math.max(3, +x.c.calories / max * H) : 0;
      const th = (x.c ? +x.c.target_calories : (targets ? targets.cals : 0)) / max * H;
      const lbl = x.d.toLocaleDateString('ar-EG', { weekday: 'narrow' });
      return `<rect x="${xx}" y="${H - th}" width="${bw}" height="${th}" rx="6" fill="#eceafb"/>` +
        (x.c ? `<rect x="${xx}" y="${H - h}" width="${bw}" height="${h}" rx="6" fill="${col[x.c.status]}"><title>${Math.round(x.c.calories)} سعرة</title></rect>` : '') +
        `<text x="${xx + bw / 2}" y="${H + 16}" text-anchor="middle" font-size="11" fill="#5b5880">${lbl}</text>`;
    }).join('');
    wk.innerHTML = `
      <h3 class="font-black text-base">ملخص آخر 7 أيام</h3>
      <p class="text-xs mb-3" style="color:var(--ink2)">العمود الملوّن = سعراتك الفعلية، والرمادي = هدفك</p>
      <div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${H + 24}" style="width:100%;max-width:520px;direction:ltr" role="img" aria-label="رسم السعرات الأسبوعي">${bars}</svg></div>`;
  }

  const _rt = renderToday;
  renderToday = function () {
    _rt();
    const done = !!(typeof closures !== 'undefined' && closures[todayStr()]);
    const t = document.getElementById('close-day-text');
    if (t) t.textContent = done ? 'تم إغلاق اليوم ✓ (إعادة الحساب)' : 'تم الانتهاء من وجبات اليوم';
    renderWeekly();
  };
})();
