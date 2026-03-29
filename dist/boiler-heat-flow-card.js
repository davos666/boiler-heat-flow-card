
const BHF_DEFAULTS = {
  type: 'custom:boiler-heat-flow-card',
  title: 'Warmtesysteem',
  animations: true,
  show_legend: true,
  show_return_temps: true,
  tank: { title: 'Boiler', top: '', middle: '', bottom: '' },
  collector: { entity: '', pump: '', label: 'Zonnecollector', icon: 'mdi:white-balance-sunny' },
  hotwater: { entity: '', active: '', flow: '', label: 'Tapwater', icon: 'mdi:water-boiler' },
  fireplace: { entity: '', active: '', label: 'Openhaard', icon: 'mdi:fireplace' },
  heatpump: {
    entity: '',
    active: '',
    supply: '',
    return: '',
    label: 'Warmtepomp',
    icon: 'mdi:heat-pump',
  },
  floor: { entity: '', active: '', flow: '', label: 'Vloerverwarming', icon: 'mdi:heating-coil' },
  radiator: { entity: '', active: '', flow: '', label: 'Radiatoren', icon: 'mdi:radiator' },
  heating: { entity: '', active: '', flow: '', label: 'Verwarming', icon: 'mdi:radiator' },
  thresholds: {
    collector_delta: 5,
    fireplace_temp: 45,
    heatpump_temp: 30,
    floor_temp: 25,
    radiator_temp: 30,
    heating_temp: 25,
    hotwater_temp: 30,
  },
};

function deepMerge(base, incoming) {
  const out = { ...base };
  for (const [key, value] of Object.entries(incoming || {})) {
    if (
      value && typeof value === 'object' && !Array.isArray(value) &&
      out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])
    ) {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

class BoilerHeatFlowCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement('boiler-heat-flow-card-editor');
  }

  static getStubConfig() {
    return deepClone(BHF_DEFAULTS);
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = deepClone(BHF_DEFAULTS);
    this._hass = undefined;
  }

  setConfig(config) {
    if (!config) throw new Error('Config ontbreekt');
    this._config = deepMerge(deepClone(BHF_DEFAULTS), config);
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 7;
  }

  getGridOptions() {
    return { rows: 7, columns: 12, min_rows: 6, max_rows: 9, min_columns: 8, max_columns: 12 };
  }

  _getStateObj(entityId) {
    return entityId && this._hass ? this._hass.states[entityId] : undefined;
  }

  _getNumeric(entityId) {
    const st = this._getStateObj(entityId);
    if (!st) return null;
    const n = Number.parseFloat(st.state);
    return Number.isFinite(n) ? n : null;
  }

  _isOn(entityId) {
    const st = this._getStateObj(entityId);
    if (!st) return false;
    return ['on', 'home', 'heat', 'heating', 'true', 'open', 'active', 'running'].includes(String(st.state).toLowerCase());
  }

  _formatValue(entityId) {
    const st = this._getStateObj(entityId);
    if (!st) return '—';
    if (st.state === 'unknown' || st.state === 'unavailable') return st.state;
    const unit = st.attributes?.unit_of_measurement || '';
    const n = Number.parseFloat(st.state);
    if (Number.isFinite(n)) {
      const decimals = Math.abs(n) >= 100 ? 0 : 1;
      return `${n.toFixed(decimals)}${unit ? ` ${unit}` : ''}`;
    }
    return `${st.state}${unit ? ` ${unit}` : ''}`;
  }

  _temperatureColor(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return '#7f8ca5';
    if (value < 20) return '#54b7ff';
    if (value < 35) return '#6ed9ff';
    if (value < 50) return '#ffbf5f';
    if (value < 65) return '#ff8c52';
    return '#ff5959';
  }

  _boilerLevel(value, min, max) {
    if (!Number.isFinite(value)) return 0.45;
    if (value <= min) return 0;
    if (value >= max) return 1;
    return (value - min) / (max - min);
  }

  _fireEvent(type, detail, options = {}) {
    const ev = new Event(type, {
      bubbles: options.bubbles ?? true,
      cancelable: options.cancelable ?? false,
      composed: options.composed ?? true,
    });
    ev.detail = detail;
    this.dispatchEvent(ev);
    return ev;
  }

  _showMoreInfo(entityId) {
    if (entityId) this._fireEvent('hass-more-info', { entityId });
  }

  _activeCollector() {
    const c = this._config.collector;
    if (c.pump) return this._isOn(c.pump);
    const collector = this._getNumeric(c.entity);
    const top = this._getNumeric(this._config.tank.top);
    if (collector === null || top === null) return false;
    return collector > top + Number(this._config.thresholds.collector_delta || 5);
  }

  _activeSection(sectionName, thresholdKey) {
    const sec = this._config[sectionName] || {};
    if (sec.active) return this._isOn(sec.active);
    const temp = this._getNumeric(sec.entity);
    const flow = this._getNumeric(sec.flow);
    const threshold = Number(this._config.thresholds?.[thresholdKey]);
    if (flow !== null) return flow > 0;
    return temp !== null && Number.isFinite(threshold) ? temp >= threshold : false;
  }

  _nodeTemplate(key, cfg, x, y, active, extraClass = '', valueOverride = '') {
    const color = this._temperatureColor(this._getNumeric(cfg.entity || cfg.supply));
    return `
      <button class="node ${active ? 'active' : ''} ${extraClass}" style="left:${x}%; top:${y}%; --accent:${color};" data-entity="${cfg.entity || cfg.supply || ''}">
        <div class="node-badge"><ha-icon icon="${cfg.icon || 'mdi:help-circle'}"></ha-icon></div>
        <div class="node-text">
          <div class="node-label">${cfg.label || key}</div>
          <div class="node-value">${valueOverride || this._formatValue(cfg.entity || cfg.supply)}</div>
          ${cfg.return && this._config.show_return_temps ? `<div class="node-subvalue">Retour: ${this._formatValue(cfg.return)}</div>` : ''}
        </div>
      </button>`;
  }

  _particle(pathId, color, dur, active, reverse = false, delay = '0s') {
    if (!active || !this._config.animations) return '';
    const rotate = reverse ? 'auto-reverse' : 'auto';
    return `
      <circle r="1.05" fill="${color}" opacity="0.95">
        <animateMotion dur="${dur}" repeatCount="indefinite" rotate="${rotate}" begin="${delay}">
          <mpath href="#${pathId}"></mpath>
        </animateMotion>
      </circle>`;
  }

  _rightSideConfig() {
    const floorEnabled = Boolean(this._config.floor?.entity);
    const radiatorEnabled = Boolean(this._config.radiator?.entity);
    const legacyEnabled = Boolean(this._config.heating?.entity);
    if (!floorEnabled && !radiatorEnabled && legacyEnabled) {
      return [{
        key: 'heating', x: 86, y: 76, active: this._activeSection('heating', 'heating_temp'),
        pipe: { id: 'pipe-heating', d: 'M77 76 L62 76 Q56 76 56 69 L56 61', colorClass: 'pipe-red', color: '#ff7d61' },
      }];
    }
    const nodes = [];
    if (floorEnabled) nodes.push({
      key: 'floor', x: 86, y: radiatorEnabled ? 68 : 76, active: this._activeSection('floor', 'floor_temp'),
      pipe: {
        id: 'pipe-floor',
        d: radiatorEnabled ? 'M77 68 L62 68 Q56 68 56 62 L56 56' : 'M77 76 L62 76 Q56 76 56 69 L56 61',
        colorClass: 'pipe-blue', color: '#6ed9ff'
      },
    });
    if (radiatorEnabled) nodes.push({
      key: 'radiator', x: 86, y: floorEnabled ? 82 : 76, active: this._activeSection('radiator', 'radiator_temp'),
      pipe: {
        id: 'pipe-radiator',
        d: floorEnabled ? 'M77 82 L62 82 Q56 82 56 74 L56 66' : 'M77 76 L62 76 Q56 76 56 69 L56 61',
        colorClass: 'pipe-red', color: '#ff7d61'
      },
    });
    return nodes;
  }

  _render() {
    if (!this.shadowRoot) return;

    const top = this._getNumeric(this._config.tank.top);
    const middle = this._getNumeric(this._config.tank.middle);
    const bottom = this._getNumeric(this._config.tank.bottom);
    const boilerValues = [top, middle, bottom].filter((v) => Number.isFinite(v));
    const avgTemp = boilerValues.length ? boilerValues.reduce((a, b) => a + b, 0) / boilerValues.length : null;
    const fillLevel = this._boilerLevel(avgTemp, 15, 80);
    const fillPct = `${14 + (fillLevel * 74)}%`;

    const collectorActive = this._activeCollector();
    const hotwaterActive = this._activeSection('hotwater', 'hotwater_temp');
    const fireplaceActive = this._activeSection('fireplace', 'fireplace_temp');
    const heatpumpActive = this._activeSection('heatpump', 'heatpump_temp');
    const rightNodes = this._rightSideConfig();
    const hasHeatpumpReturn = Boolean(this._config.heatpump.return);
    const hpPipeHtml = hasHeatpumpReturn ? `
            <path id="pipe-heatpump-supply" class="pipe-bg" d="M77 50 L64 50 Q58 50 58 46 L58 42" />
            <path class="pipe-glow pipe-green" d="M77 50 L64 50 Q58 50 58 46 L58 42" />
            <path class="pipe-active pipe-green ${heatpumpActive && this._config.animations ? 'on' : ''}" d="M77 50 L64 50 Q58 50 58 46 L58 42" />
            ${this._particle('pipe-heatpump-supply', '#8ce38a', '1.65s', heatpumpActive, false, '0s')}
            ${this._particle('pipe-heatpump-supply', '#8ce38a', '1.65s', heatpumpActive, false, '0.82s')}

            <path id="pipe-heatpump-return" class="pipe-bg" d="M58 63 L58 68 Q58 72 64 72 L77 72" />
            <path class="pipe-glow pipe-blue" d="M58 63 L58 68 Q58 72 64 72 L77 72" />
            <path class="pipe-active pipe-blue ${heatpumpActive && this._config.animations ? 'on' : ''}" d="M58 63 L58 68 Q58 72 64 72 L77 72" />
            ${this._particle('pipe-heatpump-return', '#5bc0ff', '1.85s', heatpumpActive, true, '0.2s')}
            ${this._particle('pipe-heatpump-return', '#5bc0ff', '1.85s', heatpumpActive, true, '1.05s')}
    ` : `
            <path id="pipe-heatpump" class="pipe-bg" d="M77 54 L62 54 Q56 54 56 49 L56 46" />
            <path class="pipe-glow pipe-green" d="M77 54 L62 54 Q56 54 56 49 L56 46" />
            <path class="pipe-active pipe-green ${heatpumpActive && this._config.animations ? 'on' : ''}" d="M77 54 L62 54 Q56 54 56 49 L56 46" />
            ${this._particle('pipe-heatpump', '#8ce38a', '1.7s', heatpumpActive, false, '0s')}
            ${this._particle('pipe-heatpump', '#8ce38a', '1.7s', heatpumpActive, false, '0.85s')}
    `;

    const hpValue = this._config.heatpump.supply ? this._formatValue(this._config.heatpump.supply) : this._formatValue(this._config.heatpump.entity);
    const rightNodeHtml = rightNodes.map((n) => this._nodeTemplate(n.key, this._config[n.key], n.x, n.y, n.active)).join('');

    const rightPipeHtml = rightNodes.map((n) => `
      <path id="${n.pipe.id}" class="pipe-bg" d="${n.pipe.d}" />
      <path class="pipe-glow ${n.pipe.colorClass}" d="${n.pipe.d}" />
      <path class="pipe-active ${n.pipe.colorClass} ${n.active && this._config.animations ? 'on' : ''}" d="${n.pipe.d}" />
      ${this._particle(n.pipe.id, n.pipe.color, '1.9s', n.active, false, '0s')}
      ${this._particle(n.pipe.id, n.pipe.color, '1.9s', n.active, false, '0.9s')}
    `).join('');

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }
        ha-card {
          position: relative;
          overflow: hidden;
          min-height: 620px;
          border-radius: 28px;
          color: #edf4ff;
          background:
            linear-gradient(180deg, #09111c 0%, #0d1624 52%, #08101a 100%);
          border: 1px solid rgba(181, 209, 255, 0.08);
          box-shadow: 0 18px 40px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.03);
        }
        ha-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 44%, rgba(66, 120, 210, 0.08), transparent 22%),
            linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.018) 48%, transparent 100%);
          pointer-events: none;
        }
        .wrap { position:relative; height:620px; padding: 12px; }
        .title {
          position:absolute; left:20px; top:14px; z-index:3;
          font-size: 24px; font-weight: 800; letter-spacing: .02em;
          text-shadow: 0 2px 10px rgba(0,0,0,0.35);
        }
        .version {
          position:absolute; right:18px; top:16px; z-index:3;
          padding: 6px 10px; border-radius: 999px; font-size:12px; color:#b7c7e4;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
        }
        svg.flow { position:absolute; inset:0; width:100%; height:100%; z-index:0; pointer-events:none; overflow:visible; }
        .pipe-bg {
          fill:none; stroke: rgba(160,184,220,0.12); stroke-width:8; stroke-linecap:round; stroke-linejoin:round;
        }
        .pipe-glow {
          fill:none; stroke-width:10; stroke-linecap:round; stroke-linejoin:round; opacity:.08; filter: blur(2px);
        }
        .pipe-active {
          fill:none; stroke-width:4; stroke-linecap:round; stroke-linejoin:round; opacity:0;
          stroke-dasharray: 6 10;
          filter: drop-shadow(0 0 4px rgba(255,255,255,0.12));
        }
        .pipe-active.on { opacity:1; animation: flow 1.25s linear infinite; }
        .pipe-hot { stroke: #ffb14f; }
        .pipe-red { stroke: #ff7d61; }
        .pipe-blue { stroke: #67c8ff; }
        .pipe-green { stroke: #8ce38a; }
        @keyframes flow { to { stroke-dashoffset: -32; } }
        .node {
          position:absolute; transform: translate(-50%, -50%); z-index:2;
          display:flex; align-items:center; gap:12px; width:220px;
          padding:14px 16px; border-radius:20px; cursor:pointer;
          border:1px solid rgba(169,191,227,0.12);
          background: linear-gradient(180deg, rgba(17,26,40,0.96), rgba(13,20,31,0.92));
          box-shadow: 0 12px 24px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.03);
          text-align:left; color:#edf4ff;
          transition: transform .16s ease, border-color .16s ease, box-shadow .16s ease;
        }
        .node:hover { transform: translate(-50%, -50%) scale(1.015); border-color: rgba(210,225,255,0.18); }
        .node.active {
          border-color: color-mix(in srgb, var(--accent) 36%, rgba(255,255,255,0.1));
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 42%, transparent), 0 10px 28px rgba(0,0,0,0.28);
        }
        .node-badge {
          width:50px; height:50px; flex:0 0 50px; border-radius:15px; display:grid; place-items:center;
          background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 18%, rgba(255,255,255,0.03)), rgba(255,255,255,0.02));
          color: var(--accent);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
        }
        .node-badge ha-icon { --mdc-icon-size: 28px; }
        .node-label { font-size:14px; color:#bbcade; }
        .node-value { font-size:20px; font-weight:800; margin-top:4px; }
        .node-subvalue { font-size:12px; color:#9fb4d8; margin-top:4px; }

        .boiler-shell {
          position:absolute; left:50%; top:56%; transform:translate(-50%, -50%); z-index:2;
          width:216px; height:358px;
        }
        .boiler-click { position:absolute; inset:0; border:none; background:none; padding:0; cursor:pointer; }
        .boiler-frame {
          position:absolute; inset:0;
          border-radius:108px;
          background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015));
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
        }
        .boiler-cap {
          position:absolute; left:34px; right:34px; top:6px; height:18px; border-radius:16px;
          background: linear-gradient(180deg, rgba(244,248,255,0.20), rgba(140,160,195,0.06));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.26);
        }
        .boiler-body {
          position:absolute; inset:18px 12px 20px; border-radius:98px;
          background: linear-gradient(180deg, #162131 0%, #0f1824 100%);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.07),
            inset 0 18px 26px rgba(255,255,255,0.022),
            0 18px 36px rgba(0,0,0,0.30);
          overflow:hidden;
        }
        .boiler-body::before {
          content:'';
          position:absolute; inset:10px;
          border-radius:88px;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
          pointer-events:none;
        }
        .boiler-fill {
          position:absolute; left:18px; right:18px; bottom:18px; height:${fillPct}; border-radius:80px;
          background:
            linear-gradient(180deg, color-mix(in srgb, ${this._temperatureColor(top)} 70%, white 8%) 0%, ${this._temperatureColor(middle)} 48%, color-mix(in srgb, ${this._temperatureColor(bottom)} 82%, #08101a 18%) 100%);
          box-shadow: inset 0 10px 16px rgba(255,255,255,0.08);
          transition: height .35s ease;
        }
        .boiler-fill::before {
          content:'';
          position:absolute; left:8%; right:8%; top:8px; height:12px; border-radius:999px;
          background: linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.16), rgba(255,255,255,0.05));
          opacity: .75;
        }
        .boiler-wave {
          position:absolute; left:24px; right:24px; bottom: calc(${fillPct} - 6px); height:10px;
          border-radius:999px;
          background: linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.12), rgba(255,255,255,0.03));
          opacity: 0.28;
        }
        .boiler-glass {
          position:absolute; inset:12px; border-radius:92px;
          background:
            linear-gradient(102deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 18%, transparent 26%, transparent 62%, rgba(255,255,255,0.08) 78%, transparent 84%);
          pointer-events:none;
        }
        .boiler-rim {
          position:absolute; inset:22px 16px 22px; border-radius:84px;
          border: 1px solid rgba(255,255,255,0.06);
          pointer-events:none;
        }
        .boiler-title {
          position:absolute; top:48px; left:0; right:0; text-align:center; z-index:3; font-size:22px; font-weight:800;
          text-shadow: 0 4px 16px rgba(0,0,0,0.34);
        }
        .boiler-avg {
          position:absolute; top:78px; left:0; right:0; text-align:center; z-index:3; font-size:13px; color:#dfe9fb;
        }
        .temp-stack {
          position:absolute; inset:114px 22px 32px; z-index:3; display:flex; flex-direction:column; justify-content:space-between;
        }
        .temp-chip {
          display:flex; align-items:center; justify-content:space-between; gap:12px; border:none; width:100%;
          background: rgba(7,11,18,0.26); color:#edf4ff; cursor:pointer;
          border-radius:14px; padding:10px 12px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
        }
        .temp-chip:hover { background: rgba(7,11,18,0.36); }
        .temp-chip .label { font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:#d9e5f8; }
        .temp-chip .value { font-size:18px; font-weight:800; }
        .thermobar {
          position:absolute; right:18px; top:122px; bottom:40px; width:8px; border-radius:999px; z-index:3;
          background: linear-gradient(180deg, #ff5f5f 0%, #ffb450 42%, #61d0ff 100%);
          opacity:.75;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12);
        }
        .legend {
          position:absolute; right:16px; bottom:14px; z-index:3; display:flex; align-items:center; gap:8px;
          padding:7px 11px; border-radius:999px; font-size:12px; color:#93a6c8;
          background: rgba(12,19,31,0.82); border:1px solid rgba(255,255,255,0.06);
        }
        .legend-dot { width:10px; height:10px; border-radius:50%; background:linear-gradient(180deg, #5bc0ff, #ff9b49); }
        .legend-arrow { width:18px; height:6px; border-radius:999px; background:linear-gradient(90deg, rgba(255,255,255,0.18), rgba(255,255,255,0.85)); }
        @media (max-width: 920px) { .node { width: 196px; } }
      </style>
      </style>
      <ha-card>
        <div class="wrap">
          <div class="title">${this._config.title || 'Warmtesysteem'}</div>
          <div class="version">v5.2</div>
          <svg class="flow" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <marker id="arrow-hot" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#ffb14f"></path>
              </marker>
            </defs>
            <path id="pipe-collector" class="pipe-bg" d="M50 18 L50 40" />
            <path class="pipe-glow pipe-hot" d="M50 18 L50 40" />
            <path class="pipe-active pipe-hot ${collectorActive && this._config.animations ? 'on' : ''}" d="M50 18 L50 40" marker-end="url(#arrow-hot)" />
            ${this._particle('pipe-collector', '#ffb14f', '1.6s', collectorActive, false, '0s')}
            ${this._particle('pipe-collector', '#ffb14f', '1.6s', collectorActive, false, '0.8s')}

            <path id="pipe-hotwater" class="pipe-bg" d="M23 31 L38 31 Q44 31 44 38 L44 42" />
            <path class="pipe-glow pipe-blue" d="M23 31 L38 31 Q44 31 44 38 L44 42" />
            <path class="pipe-active pipe-blue ${hotwaterActive && this._config.animations ? 'on' : ''}" d="M23 31 L38 31 Q44 31 44 38 L44 42" />
            ${this._particle('pipe-hotwater', '#5bc0ff', '1.7s', hotwaterActive, true, '0s')}
            ${this._particle('pipe-hotwater', '#5bc0ff', '1.7s', hotwaterActive, true, '0.85s')}

            <path id="pipe-fireplace" class="pipe-bg" d="M23 54 L38 54 Q44 54 44 49 L44 46" />
            <path class="pipe-glow pipe-red" d="M23 54 L38 54 Q44 54 44 49 L44 46" />
            <path class="pipe-active pipe-red ${fireplaceActive && this._config.animations ? 'on' : ''}" d="M23 54 L38 54 Q44 54 44 49 L44 46" />
            ${this._particle('pipe-fireplace', '#ff7d61', '1.7s', fireplaceActive, false, '0s')}
            ${this._particle('pipe-fireplace', '#ff7d61', '1.7s', fireplaceActive, false, '0.85s')}

            ${hpPipeHtml}
            ${rightPipeHtml}
          </svg>

          ${this._nodeTemplate('collector', this._config.collector, 50, 12.5, collectorActive, 'top-node')}
          ${this._nodeTemplate('hotwater', this._config.hotwater, 14, 29.5, hotwaterActive)}
          ${this._nodeTemplate('fireplace', this._config.fireplace, 14, 54, fireplaceActive)}
          ${this._nodeTemplate('heatpump', this._config.heatpump, 86, 54, heatpumpActive, '', hpValue)}
          ${rightNodeHtml}

          <div class="boiler-shell">
            <div class="boiler-frame"></div>
            <div class="boiler-cap"></div>
            <button class="boiler-click" data-entity="${this._config.tank.middle || this._config.tank.top || this._config.tank.bottom || ''}" aria-label="Open boiler details">
              <div class="boiler-body">
                <div class="boiler-fill"></div>
                <div class="boiler-wave"></div>
                <div class="boiler-glass"></div>
                <div class="boiler-rim"></div>
              </div>
            </button>
            <div class="boiler-title">${this._config.tank.title || 'Boiler'}</div>
            <div class="boiler-avg">Gemiddeld: ${avgTemp === null ? '—' : `${avgTemp.toFixed(1)} °C`}</div>
            <div class="thermobar"></div>
            <div class="temp-stack">
              <button class="temp-chip" data-entity="${this._config.tank.top || ''}"><span class="label">Boven</span><span class="value">${this._formatValue(this._config.tank.top)}</span></button>
              <button class="temp-chip" data-entity="${this._config.tank.middle || ''}"><span class="label">Midden</span><span class="value">${this._formatValue(this._config.tank.middle)}</span></button>
              <button class="temp-chip" data-entity="${this._config.tank.bottom || ''}"><span class="label">Onder</span><span class="value">${this._formatValue(this._config.tank.bottom)}</span></button>
            </div>
          </div>

          ${this._config.show_legend ? '<div class="legend"><span class="legend-dot"></span><span class="legend-arrow"></span> warmteflow actief</div>' : ''}
        </div>
      </ha-card>`;

    this.shadowRoot.querySelectorAll('[data-entity]').forEach((el) => {
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const entityId = el.getAttribute('data-entity');
        this._showMoreInfo(entityId);
      });
    });
  }
}

class BoilerHeatFlowCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = deepClone(BHF_DEFAULTS);
    this._hass = undefined;
  }

  setConfig(config) {
    this._config = deepMerge(deepClone(BHF_DEFAULTS), config || {});
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _setSection(section, value) {
    const next = deepClone(this._config);
    next[section] = deepMerge(next[section] || {}, value || {});
    this._update(next);
  }

  _update(next) {
    this._config = next;
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: next }, bubbles: true, composed: true,
    }));
    this._render();
  }

  _render() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; padding-top:8px; }
        .editor { display:flex; flex-direction:column; gap:12px; }
        details {
          border: 1px solid var(--divider-color);
          border-radius: 18px;
          background: var(--card-background-color);
          overflow: hidden;
        }
        summary {
          list-style:none;
          cursor:pointer;
          padding: 14px 16px;
          font-weight: 700;
        }
        summary::-webkit-details-marker { display:none; }
        .content { padding: 0 14px 14px; }
        .hint { color: var(--secondary-text-color); font-size:12px; margin: 4px 0 10px; }
        ha-form { display:block; }
      </style>
      <div class="editor">
        <details open><summary>Algemeen</summary><div class="content"><div id="general"></div></div></details>
        <details open><summary>Boiler</summary><div class="content"><div id="tank"></div></div></details>
        <details><summary>Zonnecollector</summary><div class="content"><div id="collector"></div></div></details>
        <details><summary>Tapwater</summary><div class="content"><div class="hint">Je kunt hier ook een debiet/flow-entity meegeven.</div><div id="hotwater"></div></div></details>
        <details><summary>Openhaard</summary><div class="content"><div id="fireplace"></div></div></details>
        <details><summary>Warmtepomp</summary><div class="content"><div class="hint">Nieuw in v5.2: aparte aanvoer- en retourlijnen in de layout.</div><div id="heatpump"></div></div></details>
        <details><summary>Vloerverwarming</summary><div class="content"><div id="floor"></div></div></details>
        <details><summary>Radiatoren</summary><div class="content"><div id="radiator"></div></div></details>
        <details><summary>Legacy verwarming</summary><div class="content"><div class="hint">Alleen gebruiken als je geen aparte vloer/radiator gebruikt.</div><div id="heating"></div></div></details>
        <details><summary>Drempels</summary><div class="content"><div id="thresholds"></div></div></details>
      </div>`;

    this._mountForm('general', [
      { name: 'title', label: 'Titel', selector: { text: {} } },
      { name: 'animations', label: 'Animaties', selector: { boolean: {} } },
      { name: 'show_legend', label: 'Legenda tonen', selector: { boolean: {} } },
      { name: 'show_return_temps', label: 'Retourtemperaturen tonen', selector: { boolean: {} } },
    ], {
      title: this._config.title,
      animations: this._config.animations,
      show_legend: this._config.show_legend,
      show_return_temps: this._config.show_return_temps,
    }, (data) => this._update(deepMerge(this._config, data)));

    this._mountForm('tank', [
      { name: 'title', label: 'Titel boiler', selector: { text: {} } },
      { name: 'top', label: 'Boiler boven', selector: { entity: { domain: ['sensor', 'number', 'input_number'] } } },
      { name: 'middle', label: 'Boiler midden', selector: { entity: { domain: ['sensor', 'number', 'input_number'] } } },
      { name: 'bottom', label: 'Boiler onder', selector: { entity: { domain: ['sensor', 'number', 'input_number'] } } },
    ], this._config.tank, (data) => this._setSection('tank', data));

    const thermalSchema = [
      { name: 'entity', label: 'Temperatuur entity', selector: { entity: { domain: ['sensor', 'number', 'input_number'] } } },
      { name: 'active', label: 'Actief entity', selector: { entity: { domain: ['binary_sensor', 'switch', 'climate', 'water_heater'] } } },
      { name: 'flow', label: 'Flow / debiet entity', selector: { entity: { domain: ['sensor', 'number', 'input_number'] } } },
      { name: 'label', label: 'Label', selector: { text: {} } },
      { name: 'icon', label: 'Icoon', selector: { icon: {} } },
    ];

    this._mountForm('collector', [
      { name: 'entity', label: 'Collector temperatuur', selector: { entity: { domain: ['sensor', 'number', 'input_number'] } } },
      { name: 'pump', label: 'Collector pomp', selector: { entity: { domain: ['binary_sensor', 'switch', 'climate', 'water_heater'] } } },
      { name: 'label', label: 'Label', selector: { text: {} } },
      { name: 'icon', label: 'Icoon', selector: { icon: {} } },
    ], this._config.collector, (data) => this._setSection('collector', data));

    this._mountForm('hotwater', thermalSchema, this._config.hotwater, (data) => this._setSection('hotwater', data));
    this._mountForm('fireplace', thermalSchema, this._config.fireplace, (data) => this._setSection('fireplace', data));
    this._mountForm('floor', thermalSchema, this._config.floor, (data) => this._setSection('floor', data));
    this._mountForm('radiator', thermalSchema, this._config.radiator, (data) => this._setSection('radiator', data));
    this._mountForm('heating', thermalSchema, this._config.heating, (data) => this._setSection('heating', data));

    this._mountForm('heatpump', [
      { name: 'entity', label: 'Hoofd temperatuur entity', selector: { entity: { domain: ['sensor', 'number', 'input_number'] } } },
      { name: 'active', label: 'Actief entity', selector: { entity: { domain: ['binary_sensor', 'switch', 'climate', 'water_heater'] } } },
      { name: 'supply', label: 'Aanvoer temperatuur', selector: { entity: { domain: ['sensor', 'number', 'input_number'] } } },
      { name: 'return', label: 'Retour temperatuur', selector: { entity: { domain: ['sensor', 'number', 'input_number'] } } },
      { name: 'label', label: 'Label', selector: { text: {} } },
      { name: 'icon', label: 'Icoon', selector: { icon: {} } },
    ], this._config.heatpump, (data) => this._setSection('heatpump', data));

    this._mountForm('thresholds', [
      { name: 'collector_delta', label: 'Collector delta t.o.v. boiler boven', selector: { number: { min: 0, max: 30, step: 0.5, mode: 'box' } } },
      { name: 'fireplace_temp', label: 'Openhaard temperatuur', selector: { number: { min: 0, max: 100, step: 0.5, mode: 'box' } } },
      { name: 'heatpump_temp', label: 'Warmtepomp temperatuur', selector: { number: { min: 0, max: 100, step: 0.5, mode: 'box' } } },
      { name: 'hotwater_temp', label: 'Tapwater temperatuur', selector: { number: { min: 0, max: 100, step: 0.5, mode: 'box' } } },
      { name: 'floor_temp', label: 'Vloerverwarming temperatuur', selector: { number: { min: 0, max: 100, step: 0.5, mode: 'box' } } },
      { name: 'radiator_temp', label: 'Radiator temperatuur', selector: { number: { min: 0, max: 100, step: 0.5, mode: 'box' } } },
      { name: 'heating_temp', label: 'Legacy verwarming temperatuur', selector: { number: { min: 0, max: 100, step: 0.5, mode: 'box' } } },
    ], this._config.thresholds, (data) => this._setSection('thresholds', data));
  }

  _mountForm(targetId, schema, data, onChange) {
    const target = this.shadowRoot.getElementById(targetId);
    if (!target) return;
    target.innerHTML = '';
    const form = document.createElement('ha-form');
    form.hass = this._hass;
    form.schema = schema;
    form.data = data;
    form.computeLabel = (s) => s.label || s.name;
    form.addEventListener('value-changed', (ev) => {
      onChange(ev.detail.value);
    });
    target.appendChild(form);
  }
}

if (!customElements.get('boiler-heat-flow-card')) {
  customElements.define('boiler-heat-flow-card', BoilerHeatFlowCard);
}
if (!customElements.get('boiler-heat-flow-card-editor')) {
  customElements.define('boiler-heat-flow-card-editor', BoilerHeatFlowCardEditor);
}

window.customCards = window.customCards || [];
if (!window.customCards.find((card) => card.type === 'boiler-heat-flow-card')) {
  window.customCards.push({
    type: 'boiler-heat-flow-card',
    name: 'Boiler Heat Flow Card',
    description: 'Thermische flow kaart voor collector, boiler, openhaard, warmtepomp en verwarmingszones.',
    preview: true,
    documentationURL: 'https://github.com/davos666/boiler-heat-flow-card',
  });
}
