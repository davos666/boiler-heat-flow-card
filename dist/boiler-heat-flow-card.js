class BoilerHeatFlowCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement('boiler-heat-flow-card-editor');
  }

  static getStubConfig() {
    return {
      type: 'custom:boiler-heat-flow-card',
      title: 'Warmtesysteem',
      fullscreen: true,
      animations: true,
      show_legend: true,
      tank: {
        title: 'Boiler',
        top: '',
        middle: '',
        bottom: '',
      },
      collector: { entity: '', pump: '', label: 'Zonnecollector', icon: 'mdi:white-balance-sunny' },
      hotwater: { entity: '', active: '', label: 'Tapwater', icon: 'mdi:water-boiler' },
      fireplace: { entity: '', active: '', label: 'Openhaard', icon: 'mdi:fireplace' },
      heatpump: { entity: '', active: '', label: 'Warmtepomp', icon: 'mdi:heat-pump' },
      floor: { entity: '', active: '', label: 'Vloerverwarming', icon: 'mdi:heating-coil' },
      radiator: { entity: '', active: '', label: 'Radiatoren', icon: 'mdi:radiator' },
      thresholds: {
        collector_delta: 5,
        fireplace_temp: 45,
        heatpump_temp: 30,
        hotwater_temp: 30,
        floor_temp: 25,
        radiator_temp: 30,
      }
    };
  }

  setConfig(config) {
    if (!config.tank) throw new Error('tank is vereist');
    this._config = {
      title: 'Warmtesysteem',
      animations: true,
      show_legend: true,
      fullscreen: true,
      ...config,
      tank: { title: 'Boiler', top: '', middle: '', bottom: '', ...(config.tank || {}) },
      collector: { entity: '', pump: '', label: 'Zonnecollector', icon: 'mdi:white-balance-sunny', ...(config.collector || {}) },
      hotwater: { entity: '', active: '', label: 'Tapwater', icon: 'mdi:water-boiler', ...(config.hotwater || {}) },
      fireplace: { entity: '', active: '', label: 'Openhaard', icon: 'mdi:fireplace', ...(config.fireplace || {}) },
      heatpump: { entity: '', active: '', label: 'Warmtepomp', icon: 'mdi:heat-pump', ...(config.heatpump || {}) },
      floor: { entity: '', active: '', label: 'Vloerverwarming', icon: 'mdi:heating-coil', ...(config.floor || {}) },
      radiator: { entity: '', active: '', label: 'Radiatoren', icon: 'mdi:radiator', ...(config.radiator || {}) },
      thresholds: {
        collector_delta: 5,
        fireplace_temp: 45,
        heatpump_temp: 30,
        hotwater_temp: 30,
        floor_temp: 25,
        radiator_temp: 30,
        ...(config.thresholds || {})
      }
    };
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this.shadowRoot) this.render();
  }

  getCardSize() { return 10; }
  getGridOptions() {
    return { rows: 10, columns: 12, min_rows: 8, min_columns: 8 };
  }

  _entityState(entityId) {
    return entityId && this._hass && this._hass.states[entityId] ? this._hass.states[entityId] : null;
  }
  _num(entityId) {
    const st = this._entityState(entityId);
    if (!st) return null;
    const v = Number(st.state);
    return Number.isFinite(v) ? v : null;
  }
  _bool(entityId) {
    const st = this._entityState(entityId);
    if (!st) return false;
    return ['on', 'home', 'open', 'heat', 'heating', 'active', 'true'].includes(String(st.state).toLowerCase());
  }
  _fmt(entityId, suffix='°C') {
    const st = this._entityState(entityId);
    if (!st) return '—';
    const n = Number(st.state);
    if (Number.isFinite(n)) return `${n.toFixed(1)} ${suffix}`;
    return st.state;
  }
  _tap(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent('hass-more-info', {
      bubbles: true, composed: true, detail: { entityId }
    }));
  }
  _avg(vals) {
    const nums = vals.filter(v => Number.isFinite(v));
    if (!nums.length) return null;
    return nums.reduce((a,b) => a+b, 0) / nums.length;
  }
  _heatColor(temp) {
    if (!Number.isFinite(temp)) return '#8fa6c2';
    if (temp < 20) return '#5db9ff';
    if (temp < 35) return '#7dd8ff';
    if (temp < 50) return '#f6c15b';
    if (temp < 65) return '#ff9b57';
    return '#ff6b5e';
  }
  _fillPercent(avg) {
    if (!Number.isFinite(avg)) return 28;
    return Math.max(16, Math.min(92, avg));
  }
  _activeSource(key, temp, tankTop, tankMid) {
    const cfg = this._config[key] || {};
    const thr = this._config.thresholds || {};
    switch (key) {
      case 'collector':
        return this._bool(cfg.pump) || (Number.isFinite(temp) && Number.isFinite(tankTop) && temp >= tankTop + Number(thr.collector_delta || 5));
      case 'hotwater':
        return this._bool(cfg.active) || (Number.isFinite(temp) && temp >= Number(thr.hotwater_temp || 30));
      case 'fireplace':
        return this._bool(cfg.active) || (Number.isFinite(temp) && temp >= Number(thr.fireplace_temp || 45));
      case 'heatpump':
        return this._bool(cfg.active) || (Number.isFinite(temp) && temp >= Number(thr.heatpump_temp || 30));
      case 'floor':
        return this._bool(cfg.active) || (Number.isFinite(temp) && temp >= Number(thr.floor_temp || 25));
      case 'radiator':
        return this._bool(cfg.active) || (Number.isFinite(temp) && temp >= Number(thr.radiator_temp || 30));
      default:
        return false;
    }
  }

  _renderNode({cls, icon, label, value, color, x, y, align='left', entity, active=false}) {
    const style = `left:${x}%;top:${y}%;--accent:${color};--active:${active ? 1 : 0.35};`;
    return `
      <button class="node ${cls} ${align} ${active ? 'active' : ''}" style="${style}" data-entity="${entity || ''}">
        <div class="icon-wrap"><ha-icon icon="${icon || 'mdi:thermometer'}"></ha-icon></div>
        <div class="text-wrap">
          <div class="label">${label || ''}</div>
          <div class="value">${value}</div>
        </div>
      </button>
    `;
  }

  _pathD(id) {
    const paths = {
      collector: 'M 50 13 C 50 20, 50 22, 50 30',
      hotwater: 'M 17 27 C 28 27, 32 27, 40 27 C 45 27, 47 28, 47 33',
      fireplace: 'M 17 49 C 28 49, 33 49, 40 49 C 45 49, 47 48, 47 45',
      heatpump: 'M 83 49 C 72 49, 67 49, 60 49 C 55 49, 53 48, 53 46',
      floor: 'M 73 77 C 66 77, 62 77, 57 77 C 53 77, 52 74, 52 69',
      radiator: 'M 27 77 C 34 77, 38 77, 43 77 C 47 77, 48 74, 48 69',
    };
    return paths[id] || '';
  }

  render() {
    if (!this._config || !this._hass) return;
    const c = this._config;
    const tankTop = this._num(c.tank.top);
    const tankMid = this._num(c.tank.middle);
    const tankBottom = this._num(c.tank.bottom);
    const avg = this._avg([tankTop, tankMid, tankBottom]);
    const fillPercent = this._fillPercent(avg);
    const tankColor = this._heatColor(avg);

    const nodes = {
      collector: { temp: this._num(c.collector.entity), value: this._fmt(c.collector.entity), color: this._heatColor(this._num(c.collector.entity)), active: this._activeSource('collector', this._num(c.collector.entity), tankTop, tankMid) },
      hotwater: { temp: this._num(c.hotwater.entity), value: this._fmt(c.hotwater.entity), color: this._heatColor(this._num(c.hotwater.entity)), active: this._activeSource('hotwater', this._num(c.hotwater.entity), tankTop, tankMid) },
      fireplace: { temp: this._num(c.fireplace.entity), value: this._fmt(c.fireplace.entity), color: this._heatColor(this._num(c.fireplace.entity)), active: this._activeSource('fireplace', this._num(c.fireplace.entity), tankTop, tankMid) },
      heatpump: { temp: this._num(c.heatpump.entity), value: this._fmt(c.heatpump.entity), color: this._heatColor(this._num(c.heatpump.entity)), active: this._activeSource('heatpump', this._num(c.heatpump.entity), tankTop, tankMid) },
      floor: { temp: this._num(c.floor.entity), value: this._fmt(c.floor.entity), color: this._heatColor(this._num(c.floor.entity)), active: this._activeSource('floor', this._num(c.floor.entity), tankTop, tankMid) },
      radiator: { temp: this._num(c.radiator.entity), value: this._fmt(c.radiator.entity), color: this._heatColor(this._num(c.radiator.entity)), active: this._activeSource('radiator', this._num(c.radiator.entity), tankTop, tankMid) },
    };

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }
        ha-card {
          position:relative;
          overflow:hidden;
          width:100%;
          min-height:${c.fullscreen === false ? '540px' : '78vh'};
          background:
            radial-gradient(circle at 50% 45%, rgba(33, 68, 118, 0.28), transparent 24%),
            linear-gradient(180deg, rgba(18,30,54,0.96) 0%, rgba(3,10,22,0.98) 100%);
          border:1px solid rgba(140, 176, 255, 0.10);
          border-radius:22px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 8px 40px rgba(0,0,0,0.35);
        }
        .wrap {
          position:relative; width:100%; height:100%; min-height:inherit;
        }
        .title {
          position:absolute; left:18px; top:14px; z-index:5;
          font-size:clamp(24px, 2.2vw, 34px); font-weight:700; color:#f5f8ff;
          letter-spacing:-0.02em;
        }
        .version {
          position:absolute; right:16px; top:14px; z-index:5;
          width:38px; height:38px; border-radius:999px; display:grid; place-items:center;
          color:#c5d4ef; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08);
          font-size:14px; font-weight:700;
        }
        svg.flow {
          position:absolute; inset:0; width:100%; height:100%; z-index:1;
        }
        .pipe-bg {
          fill:none; stroke:rgba(131, 153, 189, 0.16); stroke-width:6.6; stroke-linecap:round; stroke-linejoin:round;
        }
        .pipe-active {
          fill:none; stroke:var(--c, #7dd8ff); stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round; opacity:0.98;
          filter: drop-shadow(0 0 6px color-mix(in srgb, var(--c) 55%, transparent));
        }
        .flow-dot {
          fill:var(--c, #7dd8ff); opacity:0.95;
          filter: drop-shadow(0 0 6px color-mix(in srgb, var(--c) 70%, transparent));
        }
        .tank {
          position:absolute; left:50%; top:50%; transform:translate(-50%, -50%);
          width:min(20vw, 250px); min-width:185px; max-width:250px; aspect-ratio:0.7/1.2;
          z-index:3; cursor:pointer;
        }
        .tank-shell {
          position:absolute; inset:0;
          border-radius:120px;
          background:linear-gradient(180deg, rgba(20,34,59,0.96), rgba(9,16,29,0.92));
          border:1px solid rgba(185,207,255,0.12);
          box-shadow: inset 12px 0 22px rgba(255,255,255,0.03), inset -18px 0 28px rgba(0,0,0,0.32), 0 12px 36px rgba(0,0,0,0.28);
          overflow:hidden;
        }
        .tank-glass {
          position:absolute; inset:14px;
          border-radius:108px;
          border:1px solid rgba(255,255,255,0.07);
          background:linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
          overflow:hidden;
        }
        .tank-topcap {
          position:absolute; left:50%; top:6px; transform:translateX(-50%);
          width:68%; height:18px; border-radius:999px;
          background:linear-gradient(180deg, rgba(255,255,255,0.26), rgba(255,255,255,0.08));
          filter: blur(0.2px);
          opacity:0.85;
        }
        .tank-highlight {
          position:absolute; left:16%; top:8%; width:16%; height:76%;
          background:linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.02));
          border-radius:999px; filter: blur(1px); opacity:0.65;
        }
        .tank-water {
          position:absolute; left:10px; right:10px; bottom:10px;
          height:${fillPercent}%;
          border-radius:0 0 95px 95px;
          overflow:hidden;
          background:linear-gradient(180deg, color-mix(in srgb, ${tankColor} 88%, white 10%) 0%, color-mix(in srgb, ${tankColor} 76%, #0d1b2c 24%) 100%);
          box-shadow: inset 0 10px 18px rgba(255,255,255,0.10), inset 0 -16px 26px rgba(0,0,0,0.18);
        }
        .tank-water::before {
          content:""; position:absolute; left:6%; right:6%; top:-14px; height:28px;
          border-radius:999px;
          background:linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.04));
          border:1px solid rgba(255,255,255,0.08);
        }
        .tank-water::after {
          content:""; position:absolute; inset:0;
          background:linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.12) 45%, rgba(255,255,255,0.02) 75%);
          opacity:0.24;
        }
        .tank-content {
          position:absolute; inset:0; z-index:2; color:#f5f8ff;
          display:grid; grid-template-rows:auto auto 1fr; padding:28px 18px 18px;
        }
        .tank-title { text-align:center; font-size:clamp(24px,2vw,34px); font-weight:800; letter-spacing:-0.03em; margin-top:8px; }
        .tank-sub { text-align:center; color:#d6e4ff; font-size:clamp(13px,1.2vw,18px); margin-top:2px; }
        .tank-zones {
          display:grid; grid-template-rows:1fr 1fr 1fr; gap:14px; margin-top:18px;
        }
        .zone {
          display:flex; align-items:center; justify-content:space-between; gap:12px;
          padding:14px 14px; border-radius:18px;
          background:linear-gradient(180deg, rgba(7,16,31,0.48), rgba(7,16,31,0.24));
          border:1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(2px);
        }
        .zone .name { color:#d9e8ff; font-size:12px; font-weight:700; letter-spacing:0.12em; }
        .zone .val { color:#ffffff; font-size:clamp(15px, 1.3vw, 18px); font-weight:800; }
        .tempbar {
          position:absolute; right:16px; top:108px; bottom:44px; width:8px; border-radius:999px;
          background:linear-gradient(180deg, #ff675a 0%, #f0c35d 50%, #6bcfff 100%);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.1), 0 0 12px rgba(255,165,84,0.12);
          opacity:0.88;
        }
        .node {
          position:absolute; transform:translate(-50%,-50%); z-index:4;
          min-width:min(24vw, 260px); max-width:280px; padding:16px 16px; border-radius:24px;
          background:linear-gradient(180deg, rgba(12,26,49,0.92), rgba(9,18,34,0.90));
          border:1px solid rgba(166,196,255,0.10);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 26px rgba(0,0,0,0.24);
          display:flex; align-items:center; gap:14px; text-align:left; cursor:pointer;
        }
        .node.right { flex-direction:row-reverse; text-align:right; }
        .node .icon-wrap {
          width:54px; height:54px; border-radius:18px; flex:0 0 54px;
          background:linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03));
          display:grid; place-items:center; color:#d7e8ff; border:1px solid rgba(255,255,255,0.06);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .node .icon-wrap ha-icon { width:26px; height:26px; }
        .node .label { color:#d5e4fc; font-size:clamp(13px,1.1vw,16px); }
        .node .value { color:#ffffff; font-size:clamp(16px,1.5vw,22px); font-weight:800; margin-top:4px; }
        .node.active {
          border-color: color-mix(in srgb, var(--accent) 35%, rgba(255,255,255,0.10));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(255,255,255,0.02), 0 10px 32px rgba(0,0,0,0.22);
        }
        .legend {
          position:absolute; right:18px; bottom:16px; z-index:4;
          display:flex; align-items:center; gap:10px; padding:10px 14px;
          background:rgba(10,18,35,0.82); border:1px solid rgba(255,255,255,0.08); border-radius:18px;
          color:#d7e6ff; font-size:14px;
        }
        .dots { display:flex; gap:8px; align-items:center; }
        .dots span { width:10px; height:10px; border-radius:999px; display:block; }
        .dots span:nth-child(1) { background:#ff9b57; }
        .dots span:nth-child(2) { background:#7dd8ff; }
        .dots span:nth-child(3) { background:#ffffff; width:18px; height:6px; border-radius:999px; opacity:0.82; }
        @media (max-width: 980px) {
          ha-card { min-height: 720px; }
          .tank { width:200px; }
          .node { min-width:190px; max-width:230px; }
          .node.collector { left:50% !important; top:14% !important; }
          .node.hotwater { left:18% !important; top:28% !important; }
          .node.fireplace { left:18% !important; top:47% !important; }
          .node.heatpump { left:82% !important; top:47% !important; }
          .node.floor { left:74% !important; top:78% !important; }
          .node.radiator { left:26% !important; top:78% !important; }
        }
      </style>
      <ha-card>
        <div class="wrap">
          <div class="title">${c.title || 'Warmtesysteem'}</div>
          <div class="version">v5.4</div>
          <svg class="flow" viewBox="0 0 100 100" preserveAspectRatio="none">
            ${Object.entries(nodes).map(([key, n]) => `
              <g style="--c:${n.color}">
                <path class="pipe-bg" d="${this._pathD(key)}"></path>
                ${n.active ? `<path class="pipe-active" d="${this._pathD(key)}"></path>` : ''}
                ${n.active && c.animations !== false ? `
                  <circle class="flow-dot" r="0.7">
                    <animateMotion dur="2.6s" repeatCount="indefinite" path="${this._pathD(key)}"></animateMotion>
                  </circle>
                  <circle class="flow-dot" r="0.52" opacity="0.75">
                    <animateMotion dur="2.6s" begin="0.75s" repeatCount="indefinite" path="${this._pathD(key)}"></animateMotion>
                  </circle>
                  <circle class="flow-dot" r="0.42" opacity="0.55">
                    <animateMotion dur="2.6s" begin="1.45s" repeatCount="indefinite" path="${this._pathD(key)}"></animateMotion>
                  </circle>` : ''}
              </g>`).join('')}
          </svg>

          ${this._renderNode({ cls:'collector', icon:c.collector.icon, label:c.collector.label, value:nodes.collector.value, color:nodes.collector.color, x:50, y:12, entity:c.collector.entity, active:nodes.collector.active })}
          ${this._renderNode({ cls:'hotwater', icon:c.hotwater.icon, label:c.hotwater.label, value:nodes.hotwater.value, color:nodes.hotwater.color, x:16, y:27, entity:c.hotwater.entity, active:nodes.hotwater.active })}
          ${this._renderNode({ cls:'fireplace', icon:c.fireplace.icon, label:c.fireplace.label, value:nodes.fireplace.value, color:nodes.fireplace.color, x:16, y:49, entity:c.fireplace.entity, active:nodes.fireplace.active })}
          ${this._renderNode({ cls:'heatpump right', icon:c.heatpump.icon, label:c.heatpump.label, value:nodes.heatpump.value, color:nodes.heatpump.color, x:84, y:49, align:'right', entity:c.heatpump.entity, active:nodes.heatpump.active })}
          ${this._renderNode({ cls:'floor right', icon:c.floor.icon, label:c.floor.label, value:nodes.floor.value, color:nodes.floor.color, x:74, y:77, align:'right', entity:c.floor.entity, active:nodes.floor.active })}
          ${this._renderNode({ cls:'radiator', icon:c.radiator.icon, label:c.radiator.label, value:nodes.radiator.value, color:nodes.radiator.color, x:26, y:77, entity:c.radiator.entity, active:nodes.radiator.active })}

          <button class="tank" data-entity="${c.tank.top || c.tank.middle || c.tank.bottom || ''}">
            <div class="tank-shell">
              <div class="tank-topcap"></div>
              <div class="tank-glass">
                <div class="tank-highlight"></div>
                <div class="tank-water"></div>
              </div>
            </div>
            <div class="tank-content">
              <div>
                <div class="tank-title">${c.tank.title || 'Boiler'}</div>
                <div class="tank-sub">Gemiddeld: ${Number.isFinite(avg) ? avg.toFixed(1) + ' °C' : '—'}</div>
              </div>
              <div class="tank-zones">
                <div class="zone"><span class="name">BOVEN</span><span class="val">${this._fmt(c.tank.top)}</span></div>
                <div class="zone"><span class="name">MIDDEN</span><span class="val">${this._fmt(c.tank.middle)}</span></div>
                <div class="zone"><span class="name">ONDER</span><span class="val">${this._fmt(c.tank.bottom)}</span></div>
              </div>
              <div></div>
            </div>
            <div class="tempbar"></div>
          </button>

          ${c.show_legend === false ? '' : `<div class="legend"><div class="dots"><span></span><span></span><span></span></div><span>warmteflow actief</span></div>`}
        </div>
      </ha-card>
    `;

    this.shadowRoot.querySelectorAll('[data-entity]').forEach(el => {
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const id = el.getAttribute('data-entity');
        if (id) this._tap(id);
      });
    });
  }
}

class BoilerHeatFlowCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config || BoilerHeatFlowCard.getStubConfig()));
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _entities(domainPrefix='') {
    if (!this._hass) return [];
    const ids = Object.keys(this._hass.states).sort();
    return domainPrefix ? ids.filter(id => id.startsWith(domainPrefix + '.')) : ids;
  }

  _value(path, fallback='') {
    return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), this._config) ?? fallback;
  }

  _set(path, value) {
    const parts = path.split('.');
    const cfg = JSON.parse(JSON.stringify(this._config));
    let cur = cfg;
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] = cur[parts[i]] || {};
      cur = cur[parts[i]];
    }
    cur[parts.at(-1)] = value;
    this._config = cfg;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: cfg }, bubbles: true, composed: true }));
    this._render();
  }

  _select(label, path, options) {
    const value = this._value(path, '');
    return `
      <label class="field">
        <span>${label}</span>
        <select data-path="${path}">
          <option value="">-- geen --</option>
          ${options.map(id => `<option value="${id}" ${id === value ? 'selected' : ''}>${id}</option>`).join('')}
        </select>
      </label>
    `;
  }

  _text(label, path, type='text') {
    const value = this._value(path, '');
    return `
      <label class="field">
        <span>${label}</span>
        <input type="${type}" data-path="${path}" value="${String(value).replace(/"/g, '&quot;')}">
      </label>
    `;
  }

  _section(title, content) {
    return `<section><h3>${title}</h3><div class="grid">${content}</div></section>`;
  }

  _render() {
    if (!this.shadowRoot) return;
    const sensorIds = this._entities('sensor');
    const binaryIds = this._entities('binary_sensor');
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; padding:12px 0; }
        * { box-sizing:border-box; font-family: var(--primary-font-family); }
        .editor { display:grid; gap:14px; }
        section {
          background: var(--card-background-color, rgba(255,255,255,0.03));
          border: 1px solid var(--divider-color, rgba(255,255,255,0.08));
          border-radius: 16px; padding: 14px;
        }
        h3 { margin:0 0 12px 0; font-size:16px; }
        .grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap:12px; }
        .field { display:grid; gap:6px; }
        .field span { font-size:12px; color: var(--secondary-text-color); }
        input, select {
          width:100%; min-height:42px; border-radius:12px; border:1px solid var(--divider-color, #384861);
          background: var(--secondary-background-color, #111926); color: var(--primary-text-color);
          padding: 10px 12px; outline:none;
        }
        .wide { grid-column: 1 / -1; }
        @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
      </style>
      <div class="editor">
        ${this._section('Algemeen', [
          this._text('Titel', 'title'),
          this._text('Fullscreen hoogte (true/false)', 'fullscreen'),
          this._text('Animaties (true/false)', 'animations'),
          this._text('Legenda tonen (true/false)', 'show_legend')
        ].join(''))}
        ${this._section('Boiler', [
          this._text('Titel', 'tank.title'),
          this._select('Boven sensor', 'tank.top', sensorIds),
          this._select('Midden sensor', 'tank.middle', sensorIds),
          this._select('Onder sensor', 'tank.bottom', sensorIds),
        ].join(''))}
        ${this._section('Zonnecollector', [
          this._text('Label', 'collector.label'),
          this._text('Icon', 'collector.icon'),
          this._select('Temperatuur sensor', 'collector.entity', sensorIds),
          this._select('Pomp binary_sensor', 'collector.pump', binaryIds),
        ].join(''))}
        ${this._section('Tapwater', [
          this._text('Label', 'hotwater.label'),
          this._text('Icon', 'hotwater.icon'),
          this._select('Temperatuur sensor', 'hotwater.entity', sensorIds),
          this._select('Actief binary_sensor', 'hotwater.active', binaryIds),
        ].join(''))}
        ${this._section('Openhaard', [
          this._text('Label', 'fireplace.label'),
          this._text('Icon', 'fireplace.icon'),
          this._select('Temperatuur sensor', 'fireplace.entity', sensorIds),
          this._select('Actief binary_sensor', 'fireplace.active', binaryIds),
        ].join(''))}
        ${this._section('Warmtepomp', [
          this._text('Label', 'heatpump.label'),
          this._text('Icon', 'heatpump.icon'),
          this._select('Temperatuur sensor', 'heatpump.entity', sensorIds),
          this._select('Actief binary_sensor', 'heatpump.active', binaryIds),
        ].join(''))}
        ${this._section('Vloerverwarming', [
          this._text('Label', 'floor.label'),
          this._text('Icon', 'floor.icon'),
          this._select('Temperatuur sensor', 'floor.entity', sensorIds),
          this._select('Actief binary_sensor', 'floor.active', binaryIds),
        ].join(''))}
        ${this._section('Radiatoren', [
          this._text('Label', 'radiator.label'),
          this._text('Icon', 'radiator.icon'),
          this._select('Temperatuur sensor', 'radiator.entity', sensorIds),
          this._select('Actief binary_sensor', 'radiator.active', binaryIds),
        ].join(''))}
        ${this._section('Thresholds', [
          this._text('Collector delta', 'thresholds.collector_delta', 'number'),
          this._text('Openhaard temp', 'thresholds.fireplace_temp', 'number'),
          this._text('Warmtepomp temp', 'thresholds.heatpump_temp', 'number'),
          this._text('Tapwater temp', 'thresholds.hotwater_temp', 'number'),
          this._text('Vloerverwarming temp', 'thresholds.floor_temp', 'number'),
          this._text('Radiator temp', 'thresholds.radiator_temp', 'number'),
        ].join(''))}
      </div>
    `;

    this.shadowRoot.querySelectorAll('input, select').forEach(el => {
      el.addEventListener('change', (ev) => {
        const path = ev.currentTarget.getAttribute('data-path');
        let value = ev.currentTarget.value;
        if (['fullscreen', 'animations', 'show_legend'].includes(path)) {
          value = value === 'true';
        } else if (ev.currentTarget.type === 'number') {
          value = Number(value);
        }
        this._set(path, value);
      });
    });
  }
}

customElements.define('boiler-heat-flow-card', BoilerHeatFlowCard);
customElements.define('boiler-heat-flow-card-editor', BoilerHeatFlowCardEditor);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'boiler-heat-flow-card',
  name: 'Boiler Heat Flow Card',
  description: 'Warmtestromen voor boiler, collector, openhaard en warmtepomp.',
  documentationURL: 'https://github.com/davos666/boiler-heat-flow-card'
});
