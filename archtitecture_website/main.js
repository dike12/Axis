// ─── AXIS FINANCE — Architecture Visualization JS ────────────────────────────
// All interactive behaviour lives here. HTML + CSS are static.

document.addEventListener('DOMContentLoaded', () => {

  // ── 1. HIGHLIGHT CONNECTED ITEMS ON CLICK ──────────────────────────────────
  // Clicking a module chip highlights all route items with the same color accent

  const chips = document.querySelectorAll('.module-chip');
  const routeModules = document.querySelectorAll('.route-module');

  const moduleMap = {
    'auth/'         : 'Auth',
    'transactions/' : 'Transactions',
    'budget/'       : 'Budget',
    'investments/'  : 'Investments',
    'analysis/'     : 'Analysis',
    'settings/'     : 'Settings',
  };

  chips.forEach(chip => {
    const nameEl = chip.querySelector('.chip-name');
    if (!nameEl) return;
    const chipName = nameEl.textContent.trim();
    const moduleName = moduleMap[chipName];

    chip.style.cursor = 'pointer';

    chip.addEventListener('click', () => {
      // Clear all highlights first
      routeModules.forEach(rm => rm.style.outline = '');
      chips.forEach(c => c.style.outline = '');

      if (!moduleName) return;

      // Find matching route module
      routeModules.forEach(rm => {
        const title = rm.querySelector('.route-module-name');
        if (title && title.textContent.trim() === moduleName) {
          rm.style.outline = '2px solid var(--emerald)';
          rm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      });

      // Highlight the clicked chip
      chip.style.outline = '2px solid var(--emerald)';
    });
  });

  // Click anywhere else to clear highlights
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.module-chip')) {
      chips.forEach(c => c.style.outline = '');
      routeModules.forEach(rm => rm.style.outline = '');
    }
  });


  // ── 2. COPY ROUTE PATH ON CLICK ────────────────────────────────────────────
  const routeItems = document.querySelectorAll('.route-item');

  routeItems.forEach(item => {
    item.style.cursor = 'pointer';
    item.title = 'Click to copy route';

    item.addEventListener('click', () => {
      const pathEl = item.querySelector('.route-path');
      const methodEl = item.querySelector('.method');
      if (!pathEl || !methodEl) return;

      const method = methodEl.textContent.trim();
      const path = pathEl.textContent.trim().split('—')[0].trim();
      const full = `${method} /api/v1${path}`;

      navigator.clipboard.writeText(full).then(() => {
        showToast(`Copied: ${full}`);
        item.style.background = 'rgba(16,185,129,0.05)';
        setTimeout(() => item.style.background = '', 600);
      });
    });
  });


  // ── 3. DB COLUMN HIGHLIGHT ──────────────────────────────────────────────────
  // Clicking a db-col with FK flag scrolls to the referenced table

  const dbCols = document.querySelectorAll('.db-col');

  dbCols.forEach(col => {
    const flag = col.querySelector('.flag-fk');
    if (!flag) return;
    col.style.cursor = 'pointer';
    col.title = 'FK — click to highlight users table';

    col.addEventListener('click', () => {
      const tables = document.querySelectorAll('.db-table');
      tables.forEach(t => {
        const name = t.querySelector('.db-table-name');
        if (name && name.textContent.trim() === 'users') {
          t.style.outline = '2px solid var(--indigo)';
          t.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          setTimeout(() => t.style.outline = '', 1800);
        }
      });
    });
  });


  // ── 4. STACK CARD EXPAND ───────────────────────────────────────────────────
  // Clicking a stack card shows a small expanded note panel below it

  const stackDetails = {
    'FastAPI'       : 'Async request handling. One APIRouter per module, all mounted in main.py. Pydantic v2 for request/response validation.',
    'PostgreSQL'    : 'Data persisted via Docker named volume (axisfinance_pgdata). Alembic handles all schema migrations on startup.',
    'SQLAlchemy'    : 'Async engine with asyncpg driver. Session injected per request via FastAPI dependency. Never use sync queries.',
    'Google OAuth'  : 'Flow: GET /auth/google → Google consent → callback → session JWT in HTTP-only cookie. user_id always from session, never request body.',
    'Alpha Vantage' : 'Free tier: 25 req/day, 5/min. Stocks use GLOBAL_QUOTE. Crypto uses CURRENCY_EXCHANGE_RATE. Runs as background task — never blocks a user request.',
    'Docker Compose': 'Two services: db (postgres:15-alpine :5432) and api (custom Dockerfile :8000). .env mounted at runtime. Hot reload via volume mount in dev.',
  };

  const stackCards = document.querySelectorAll('.stack-card');

  stackCards.forEach(card => {
    const name = card.querySelector('.stack-name');
    if (!name) return;
    const detail = stackDetails[name.textContent.trim()];
    if (!detail) return;

    card.style.cursor = 'pointer';

    // Add expand indicator
    const indicator = document.createElement('div');
    indicator.textContent = '+ details';
    indicator.style.cssText = 'font-size:9px;color:var(--muted);margin-top:8px;letter-spacing:0.08em;';
    card.appendChild(indicator);

    // Detail panel (hidden by default)
    const panel = document.createElement('div');
    panel.style.cssText = `
      display: none;
      font-size: 10px;
      color: #94A3B8;
      line-height: 1.7;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #1C2333;
    `;
    panel.textContent = detail;
    card.appendChild(panel);

    let open = false;

    card.addEventListener('click', (e) => {
      open = !open;
      panel.style.display = open ? 'block' : 'none';
      indicator.textContent = open ? '− close' : '+ details';
    });
  });


  // ── 5. SMOOTH SCROLL NAV (section labels) ──────────────────────────────────
  const sectionLabels = document.querySelectorAll('.section-label');

  // Build a mini floating nav
  const nav = document.createElement('div');
  nav.id = 'float-nav';
  nav.style.cssText = `
    position: fixed;
    top: 50%;
    right: 20px;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 999;
  `;

  const sectionNames = [
    'Stack', 'Architecture', 'Rollover', 'Flow', 'Database', 'Routes'
  ];

  sectionLabels.forEach((label, i) => {
    // Give each section an id
    const section = label.closest('section');
    if (!section) return;
    const id = `section-${i}`;
    section.id = id;

    const dot = document.createElement('div');
    dot.style.cssText = `
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #1C2333;
      border: 1px solid #2A3650;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
    `;
    dot.title = sectionNames[i] || `Section ${i + 1}`;

    dot.addEventListener('mouseenter', () => {
      dot.style.background = 'var(--emerald)';
      dot.style.transform = 'scale(1.4)';
    });

    dot.addEventListener('mouseleave', () => {
      dot.style.background = '#1C2333';
      dot.style.transform = 'scale(1)';
    });

    dot.addEventListener('click', () => {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    nav.appendChild(dot);
  });

  document.body.appendChild(nav);

  // Highlight active dot on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        const idx = parseInt(id.split('-')[1]);
        nav.querySelectorAll('div').forEach((dot, i) => {
          dot.style.background = i === idx ? 'var(--emerald)' : '#1C2333';
          dot.style.boxShadow  = i === idx ? '0 0 6px var(--emerald)' : 'none';
        });
      }
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('section[id]').forEach(s => observer.observe(s));


  // ── 6. TOAST HELPER ────────────────────────────────────────────────────────
  function showToast(msg) {
    let toast = document.getElementById('arch-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'arch-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 32px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: #111820;
        border: 1px solid #2A3650;
        color: #10B981;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        padding: 10px 20px;
        border-radius: 8px;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.2s, transform 0.2s;
        pointer-events: none;
      `;
      document.body.appendChild(toast);
    }

    toast.textContent = msg;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 2000);
  }


  // ── 7. KEYBOARD SHORTCUT ───────────────────────────────────────────────────
  // Press '?' to show shortcuts overlay
  document.addEventListener('keydown', (e) => {
    if (e.key === '?') showShortcuts();
    if (e.key === 'Escape') {
      const overlay = document.getElementById('shortcuts-overlay');
      if (overlay) overlay.remove();
    }
  });

  function showShortcuts() {
    let overlay = document.getElementById('shortcuts-overlay');
    if (overlay) { overlay.remove(); return; }

    overlay = document.createElement('div');
    overlay.id = 'shortcuts-overlay';
    overlay.style.cssText = `
      position: fixed; inset: 0;
      background: rgba(6,8,16,0.85);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    overlay.innerHTML = `
      <div style="background:#111820;border:1px solid #2A3650;border-radius:16px;padding:32px 40px;min-width:340px;">
        <div style="font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:#F1F5F9;margin-bottom:20px;">Keyboard Shortcuts</div>
        <div style="display:flex;flex-direction:column;gap:12px;font-size:11px;color:#64748B;">
          <div style="display:flex;justify-content:space-between;gap:32px;"><span>Click module chip</span><span style="color:#10B981">Highlight API routes</span></div>
          <div style="display:flex;justify-content:space-between;gap:32px;"><span>Click route item</span><span style="color:#10B981">Copy to clipboard</span></div>
          <div style="display:flex;justify-content:space-between;gap:32px;"><span>Click stack card</span><span style="color:#10B981">Expand details</span></div>
          <div style="display:flex;justify-content:space-between;gap:32px;"><span>Click FK badge</span><span style="color:#10B981">Highlight users table</span></div>
          <div style="display:flex;justify-content:space-between;gap:32px;"><span>Right-side dots</span><span style="color:#10B981">Jump to section</span></div>
          <div style="display:flex;justify-content:space-between;gap:32px;"><span style="font-family:'JetBrains Mono',monospace;background:#1C2333;padding:2px 8px;border-radius:4px;">?</span><span style="color:#10B981">Toggle this panel</span></div>
          <div style="display:flex;justify-content:space-between;gap:32px;"><span style="font-family:'JetBrains Mono',monospace;background:#1C2333;padding:2px 8px;border-radius:4px;">Esc</span><span style="color:#10B981">Close this panel</span></div>
        </div>
      </div>
    `;

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);
  }

  // Show hint on first load
  setTimeout(() => showToast('Press ? for keyboard shortcuts'), 1200);

});
