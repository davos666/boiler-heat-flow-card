class BoilerHeatFlowCard extends HTMLElement {

  static getStubConfig() {
    return {
      type: 'custom:boiler-heat-flow-card',
      title: 'Warmtesysteem',
      animations: true,
      show_legend: true,
      center_no_grid: false,
      card_height: '560px',
      card_width: '100%',
      min_height: '560px',
      tank: { title: 'Boiler', top: '', middle: '', bottom: '' },
      collector: { entity: '', pump: '', label: 'Zonnecollector', icon: 'mdi:white-balance-sunny' },
      hotwater: { entity: '', active: '', flow_entity: '', flow_unit: 'l/min', label: 'Tapwater', icon: 'mdi:water-boiler' },
      fireplace: { entity: '', active: '', label: 'Openhaard', icon: 'mdi:fireplace' },
      heatpump: {
        entity: '', supply_entity: '', return_entity: '', active: '',
        label: 'Warmtepomp', icon: 'mdi:heat-pump',
      },
      floor: { entity: '', active: '', label: 'Vloerverwarming', icon: 'mdi:heating-coil' },
      radiator: { entity: '', active: '', label: 'Radiatoren', icon: 'mdi:radiator' },
      thresholds: {
        collector_delta: 5, fireplace_temp: 45, heatpump_temp: 30,
        hotwater_temp: 30, floor_temp: 25, radiator_temp: 30,
      },
    };
  }

  setConfig(config) {
    this._config = this._mergeConfig(config || {});
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this.render();
  }

  _mergeConfig(config) {
    const stub = BoilerHeatFlowCard.getStubConfig();
    return {
      ...stub,
      ...config,
      tank: { ...stub.tank, ...(config.tank || {}) },
      collector: { ...stub.collector, ...(config.collector || {}) },
      hotwater: { ...stub.hotwater, ...(config.hotwater || {}) },
      fireplace: { ...stub.fireplace, ...(config.fireplace || {}) },
      heatpump: { ...stub.heatpump, ...(config.heatpump || {}) },
      floor: { ...stub.floor, ...(config.floor || {}) },
      radiator: { ...stub.radiator, ...(config.radiator || {}) },
      thresholds: { ...stub.thresholds, ...(config.thresholds || {}) },
    };
  }

  set hass(hass) {
    this._hass = hass;
    if (this.shadowRoot) this.render();
  }

  getCardSize() { return 8; }
  getGridOptions() {
    return { rows: 8, columns: 12, min_rows: 6, min_columns: 8 };
  }

  _entityState(entityId) {
    return entityId && this._hass && this._hass.states && this._hass.states[entityId] ? this._hass.states[entityId] : null;
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
  _fmtEntity(entityId, suffix='°C') {
    const st = this._entityState(entityId);
    if (!st) return '—';
    const n = Number(st.state);
    if (Number.isFinite(n)) return `${n.toFixed(1)} ${suffix}`;
    return st.state;
  }
  _fmtNumber(value, suffix='°C') {
    return Number.isFinite(value) ? `${value.toFixed(1)} ${suffix}` : '—';
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
    if (temp < 35) return '#74cfff';
    if (temp < 50) return '#f5bf59';
    if (temp < 65) return '#ff9958';
    return '#ff6d5b';
  }
  _fillPercent(avg) {
    if (!Number.isFinite(avg)) return 34;
    return Math.max(18, Math.min(82, avg));
  }
  _activeSource(key, temp, tankTop) {
    const cfg = this._config[key] || {};
    const thr = this._config.thresholds || {};
    switch (key) {
      case 'collector':
        return this._bool(cfg.pump) || (Number.isFinite(temp) && Number.isFinite(tankTop) && temp >= tankTop + Number(thr.collector_delta || 5));
      case 'hotwater': {
        const flow = this._num(cfg.flow_entity);
        return this._bool(cfg.active) || (Number.isFinite(flow) && flow > 0) || (Number.isFinite(temp) && temp >= Number(thr.hotwater_temp || 30));
      }
      case 'fireplace':
        return this._bool(cfg.active) || (Number.isFinite(temp) && temp >= Number(thr.fireplace_temp || 45));
      case 'heatpump': {
        const supply = this._num(cfg.supply_entity);
        return this._bool(cfg.active) || (Number.isFinite(supply) && supply >= Number(thr.heatpump_temp || 30)) || (Number.isFinite(temp) && temp >= Number(thr.heatpump_temp || 30));
      }
      case 'floor':
        return this._bool(cfg.active) || (Number.isFinite(temp) && temp >= Number(thr.floor_temp || 25));
      case 'radiator':
        return this._bool(cfg.active) || (Number.isFinite(temp) && temp >= Number(thr.radiator_temp || 30));
      default:
        return false;
    }
  }

  _renderNode({cls, icon, label, value, subvalue='', color, x, y, align='left', entity, active=false}) {
    const style = `left:${x}%;top:${y}%;--accent:${color};`;
    return `
      <button class="node ${cls} ${align} ${active ? 'active' : ''}" style="${style}" data-entity="${entity || ''}">
        <div class="icon-wrap"><ha-icon icon="${icon || 'mdi:thermometer'}"></ha-icon></div>
        <div class="text-wrap">
          <div class="label">${label || ''}</div>
          <div class="value">${value}</div>
          ${subvalue ? `<div class="subvalue">${subvalue}</div>` : ''}
        </div>
      </button>
    `;
  }

  _pathD(id) {
    const paths = {
      collector: 'M 50 12 L 50 22 L 50 29',
      hotwater: 'M 17 29 L 33 29 L 41 29 L 41 35',
      fireplace: 'M 17 47 L 34 47 L 44 47',
      heatpump_supply: 'M 83 42 L 69 42 L 58 42 L 58 46',
      heatpump_return: 'M 83 54 L 69 54 L 58 54 L 58 50',
      floor: 'M 78 74 L 66 74 L 54 74 L 54 69',
      radiator: 'M 22 74 L 34 74 L 46 74 L 46 69',
    };
    return paths[id] || '';
  }

  _renderPipe(id, color, active, dur = '2.8s', reverse = false) {
    const path = this._pathD(id);
    return `
      <g style="--c:${color}">
        <path class="pipe-bg" d="${path}"></path>
        ${active ? `<path class="pipe-active" d="${path}"></path>` : ''}
        ${active && this._config.animations !== false ? `
          <circle class="flow-dot" r="0.54">
            <animateMotion dur="${dur}" repeatCount="indefinite" ${reverse ? 'keyPoints="1;0" keyTimes="0;1" calcMode="linear"' : ''} path="${path}"></animateMotion>
          </circle>
          <circle class="flow-dot" r="0.38" opacity="0.72">
            <animateMotion dur="${dur}" begin="0.95s" repeatCount="indefinite" ${reverse ? 'keyPoints="1;0" keyTimes="0;1" calcMode="linear"' : ''} path="${path}"></animateMotion>
          </circle>` : ''}
      </g>`;
  }

  render() {
    if (!this._config) return;
    const c = this._config;
    const tankTop = this._num(c.tank.top);
    const tankMid = this._num(c.tank.middle);
    const tankBottom = this._num(c.tank.bottom);
    const avg = this._avg([tankTop, tankMid, tankBottom]);
    const fillPercent = this._fillPercent(avg);
    const tankColor = this._heatColor(avg);
    const hpSupply = this._num(c.heatpump.supply_entity);
    const hpReturn = this._num(c.heatpump.return_entity);
    const hpMain = Number.isFinite(hpSupply) ? hpSupply : this._num(c.heatpump.entity);
    const hotwaterFlow = this._num(c.hotwater.flow_entity);

    const nodes = {
      collector: { value: this._fmtEntity(c.collector.entity), color: this._heatColor(this._num(c.collector.entity)), active: this._activeSource('collector', this._num(c.collector.entity), tankTop) },
      hotwater: { value: this._fmtEntity(c.hotwater.entity), subvalue: Number.isFinite(hotwaterFlow) ? `${hotwaterFlow.toFixed(1)} ${c.hotwater.flow_unit || 'l/min'}` : '', color: this._heatColor(this._num(c.hotwater.entity)), active: this._activeSource('hotwater', this._num(c.hotwater.entity), tankTop) },
      fireplace: { value: this._fmtEntity(c.fireplace.entity), color: this._heatColor(this._num(c.fireplace.entity)), active: this._activeSource('fireplace', this._num(c.fireplace.entity), tankTop) },
      heatpump: { value: this._fmtNumber(hpMain), subvalue: (Number.isFinite(hpSupply) || Number.isFinite(hpReturn)) ? `Aanvoer ${this._fmtNumber(hpSupply)} · Retour ${this._fmtNumber(hpReturn)}` : '', color: this._heatColor(hpMain), active: this._activeSource('heatpump', hpMain, tankTop) },
      floor: { value: this._fmtEntity(c.floor.entity), color: this._heatColor(this._num(c.floor.entity)), active: this._activeSource('floor', this._num(c.floor.entity), tankTop) },
      radiator: { value: this._fmtEntity(c.radiator.entity), color: this._heatColor(this._num(c.radiator.entity)), active: this._activeSource('radiator', this._num(c.radiator.entity), tankTop) },
    };

    const width = c.card_width || '100%';
    const height = c.card_height || '560px';
    const centered = c.center_no_grid !== false;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; width:100%; }
        ha-card {
          position:relative;
          overflow:hidden;
          width:${width};
          min-height:${c.min_height || '560px'};
          height:${height};
          max-width:100%;
          margin:${centered ? '0 auto' : '0'};
          background: linear-gradient(180deg, rgba(14,24,42,0.98) 0%, rgba(5,11,22,0.99) 100%);
          border:1px solid rgba(162,188,233,0.12);
          border-radius:24px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 14px 44px rgba(0,0,0,0.32);
        }
        .wrap { position:relative; width:100%; height:100%; min-height:inherit; }
        .title { position:absolute; left:20px; top:16px; z-index:5; font-size:clamp(22px, 1.5vw, 30px); font-weight:700; color:#f6f9ff; }
        .version { position:absolute; right:18px; top:16px; z-index:5; width:38px; height:38px; border-radius:999px; display:grid; place-items:center; background:rgba(255,255,255,0.04); color:#d6e3fb; border:1px solid rgba(255,255,255,0.08); font-size:13px; font-weight:700; }
        svg.flow { position:absolute; inset:0; width:100%; height:100%; z-index:1; }
        .pipe-bg { fill:none; stroke:rgba(148, 169, 201, 0.18); stroke-width:1.65; stroke-linecap:round; stroke-linejoin:round; }
        .pipe-active { fill:none; stroke:var(--c); stroke-width:1.05; stroke-linecap:round; stroke-linejoin:round; filter: drop-shadow(0 0 3px color-mix(in srgb, var(--c) 45%, transparent)); }
        .flow-dot { fill:var(--c); filter: drop-shadow(0 0 4px color-mix(in srgb, var(--c) 60%, transparent)); }

        .tank { position:absolute; left:50%; top:50%; transform:translate(-50%, -50%); width:200px; height:392px; z-index:3; cursor:pointer; border:0; background:none; padding:0; }
        .tank-shell { position:absolute; inset:12px 18px; border-radius:100px; background:linear-gradient(180deg, #182741 0%, #0c1526 100%); border:1px solid rgba(186,205,241,0.14); box-shadow: inset 10px 0 20px rgba(255,255,255,0.03), inset -14px 0 24px rgba(0,0,0,0.28), 0 18px 36px rgba(0,0,0,0.18); overflow:hidden; }
        .tank-shell::before { content:""; position:absolute; left:14%; top:7%; width:10px; height:78%; border-radius:999px; background:linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.01)); opacity:0.4; }
        .tank-shell::after { content:""; position:absolute; inset:10px; border-radius:90px; border:1px solid rgba(255,255,255,0.05); }
        .tank-cap { position:absolute; left:50%; top:0; transform:translateX(-50%); width:110px; height:18px; border-radius:999px; background:linear-gradient(180deg, rgba(255,255,255,0.26), rgba(255,255,255,0.07)); }
        .tank-water {
          position:absolute; left:18px; right:18px; bottom:18px; height:${fillPercent}%;
          background:linear-gradient(180deg, color-mix(in srgb, ${tankColor} 88%, white 12%) 0%, color-mix(in srgb, ${tankColor} 78%, #10243c 22%) 100%);
          border-radius:18px 18px 34px 34px;
          box-shadow: inset 0 8px 12px rgba(255,255,255,0.06), inset 0 -8px 14px rgba(0,0,0,0.12);
          overflow:hidden;
        }
        .tank-water::before { content:""; position:absolute; left:14px; right:14px; top:-7px; height:14px; border-radius:999px; background:linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.03)); border:1px solid rgba(255,255,255,0.06); }
        .tank-content { position:absolute; inset:0; z-index:2; padding:26px 18px 18px; color:#f6f9ff; }
        .tank-title { text-align:center; font-size:24px; font-weight:800; margin-top:4px; }
        .tank-sub { text-align:center; color:#d8e5fb; font-size:13px; margin-top:2px; }
        .zones { display:grid; grid-template-rows:1fr 1fr 1fr; gap:14px; margin-top:18px; }
        .zone { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-radius:18px; background:linear-gradient(180deg, rgba(8,16,31,0.58), rgba(8,16,31,0.32)); border:1px solid rgba(255,255,255,0.07); }
        .zone .name { font-size:11px; letter-spacing:0.12em; color:#dbe7ff; font-weight:700; }
        .zone .val { font-size:15px; color:#fff; font-weight:800; }
        .tempbar { position:absolute; right:20px; top:106px; bottom:42px; width:8px; border-radius:999px; background:linear-gradient(180deg, #ff675b 0%, #f3c05e 50%, #67cfff 100%); opacity:0.95; }

        .node { position:absolute; transform:translate(-50%,-50%); z-index:4; min-width:220px; max-width:260px; padding:14px 16px; display:flex; align-items:center; gap:12px; text-align:left; border-radius:22px; border:1px solid rgba(173,198,243,0.10); background:linear-gradient(180deg, rgba(12,25,45,0.94), rgba(8,16,30,0.92)); box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 10px 24px rgba(0,0,0,0.2); cursor:pointer; }
        .node.right { flex-direction:row-reverse; text-align:right; }
        .node.active { border-color: color-mix(in srgb, var(--accent) 35%, rgba(255,255,255,0.10)); }
        .icon-wrap { width:50px; height:50px; border-radius:16px; flex:0 0 50px; display:grid; place-items:center; background:linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03)); border:1px solid rgba(255,255,255,0.06); color:#dce9ff; }
        .icon-wrap ha-icon { width:24px; height:24px; }
        .label { color:#d7e6ff; font-size:14px; }
        .value { color:#fff; font-weight:800; font-size:20px; margin-top:2px; }
        .subvalue { color:#a9c0df; font-size:12px; margin-top:4px; }

        .legend { position:absolute; right:18px; bottom:16px; z-index:4; display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:18px; border:1px solid rgba(255,255,255,0.08); background:rgba(10,18,35,0.84); color:#d9e6fb; font-size:14px; }
        .legend-dots { display:flex; gap:7px; align-items:center; }
        .legend-dots span { width:10px; height:10px; border-radius:999px; display:block; }
        .legend-dots span:nth-child(1) { background:#ff9958; }
        .legend-dots span:nth-child(2) { background:#67cfff; }
        .legend-dots span:nth-child(3) { background:#fff; width:18px; height:6px; }

        @media (max-width: 1100px) {
          ha-card { width:100%; min-height:640px; }
          .tank { width:180px; height:360px; }
          .node { min-width:186px; max-width:220px; }
          .value { font-size:18px; }
          .node.collector { left:50% !important; top:10% !important; }
          .node.hotwater { left:18% !important; top:29% !important; }
          .node.fireplace { left:18% !important; top:47% !important; }
          .node.heatpump { left:82% !important; top:48% !important; }
          .node.floor { left:78% !important; top:75% !important; }
          .node.radiator { left:22% !important; top:75% !important; }
        }
      </style>
      <ha-card>
        <div class="wrap">
          <div class="title">${c.title || 'Warmtesysteem'}</div>
          <div class="version">v6.1</div>
          <svg class="flow" viewBox="0 0 100 100" preserveAspectRatio="none">
            ${this._renderPipe('collector', nodes.collector.color, nodes.collector.active, '2.6s')}
            ${this._renderPipe('hotwater', nodes.hotwater.color, nodes.hotwater.active, '2.8s', true)}
            ${this._renderPipe('fireplace', nodes.fireplace.color, nodes.fireplace.active, '2.7s')}
            ${this._renderPipe('heatpump_supply', nodes.heatpump.color, nodes.heatpump.active, '2.4s', true)}
            ${this._renderPipe('heatpump_return', '#7db2ff', nodes.heatpump.active, '2.9s')}
            ${this._renderPipe('floor', nodes.floor.color, nodes.floor.active, '3.0s', true)}
            ${this._renderPipe('radiator', nodes.radiator.color, nodes.radiator.active, '3.0s')}
          </svg>

          ${this._renderNode({ cls:'collector', icon:c.collector.icon, label:c.collector.label, value:nodes.collector.value, color:nodes.collector.color, x:50, y:10, entity:c.collector.entity, active:nodes.collector.active })}
          ${this._renderNode({ cls:'hotwater', icon:c.hotwater.icon, label:c.hotwater.label, value:nodes.hotwater.value, subvalue:nodes.hotwater.subvalue, color:nodes.hotwater.color, x:17, y:29, entity:c.hotwater.flow_entity || c.hotwater.entity, active:nodes.hotwater.active })}
          ${this._renderNode({ cls:'fireplace', icon:c.fireplace.icon, label:c.fireplace.label, value:nodes.fireplace.value, color:nodes.fireplace.color, x:17, y:47, entity:c.fireplace.entity, active:nodes.fireplace.active })}
          ${this._renderNode({ cls:'heatpump right', icon:c.heatpump.icon, label:c.heatpump.label, value:nodes.heatpump.value, subvalue:nodes.heatpump.subvalue, color:nodes.heatpump.color, x:83, y:48, align:'right', entity:c.heatpump.supply_entity || c.heatpump.entity, active:nodes.heatpump.active })}
          ${this._renderNode({ cls:'floor right', icon:c.floor.icon, label:c.floor.label, value:nodes.floor.value, color:nodes.floor.color, x:78, y:74, align:'right', entity:c.floor.entity, active:nodes.floor.active })}
          ${this._renderNode({ cls:'radiator', icon:c.radiator.icon, label:c.radiator.label, value:nodes.radiator.value, color:nodes.radiator.color, x:22, y:74, entity:c.radiator.entity, active:nodes.radiator.active })}

          <button class="tank" data-entity="${c.tank.top || c.tank.middle || c.tank.bottom || ''}">
            <div class="tank-cap"></div>
            <div class="tank-shell"><div class="tank-water"></div></div>
            <div class="tank-content">
              <div class="tank-title">${c.tank.title || 'Boiler'}</div>
              <div class="tank-sub">Gemiddeld: ${Number.isFinite(avg) ? avg.toFixed(1) + ' °C' : '—'}</div>
              <div class="zones">
                <div class="zone"><span class="name">BOVEN</span><span class="val">${this._fmtEntity(c.tank.top)}</span></div>
                <div class="zone"><span class="name">MIDDEN</span><span class="val">${this._fmtEntity(c.tank.middle)}</span></div>
                <div class="zone"><span class="name">ONDER</span><span class="val">${this._fmtEntity(c.tank.bottom)}</span></div>
              </div>
            </div>
            <div class="tempbar"></div>
          </button>

          ${c.show_legend === false ? '' : `<div class="legend"><div class="legend-dots"><span></span><span></span><span></span></div><span>warmteflow actief</span></div>`}
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


window.customCards = window.customCards || [];
window.customCards.push({
  type: 'boiler-heat-flow-card',
  name: 'Boiler Heat Flow Card',
  description: 'Warmtestromen voor boiler, collector, openhaard en warmtepomp.',
  documentationURL: 'https://github.com/davos666/boiler-heat-flow-card'
});
