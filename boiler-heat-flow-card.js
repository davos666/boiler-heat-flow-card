const BHF_DEFAULTS = {
  type: 'custom:boiler-heat-flow-card',
  title: 'Warmtesysteem',
  animations: true,
  show_legend: true,
  tank: {
    title: 'Boiler',
    top: '',
    middle: '',
    bottom: '',
  },
  collector: {
    entity: '',
    pump: '',
    label: 'Zonnecollector',
    icon: 'mdi:white-balance-sunny',
  },
  hotwater: {
    entity: '',
    active: '',
    label: 'Tapwater',
    icon: 'mdi:water-boiler',
  },
  fireplace: {
    entity: '',
    active: '',
    label: 'Openhaard',
    icon: 'mdi:fireplace',
  },
  heatpump: {
    entity: '',
    active: '',
    label: 'Warmtepomp',
    icon: 'mdi:heat-pump',
  },
  floor: {
    entity: '',
    active: '',
    label: 'Vloerverwarming',
    icon: 'mdi:heating-coil',
  },
  radiator: {
    entity: '',
    active: '',
    label: 'Radiatoren',
    icon: 'mdi:radiator',
  },
  heating: {
    entity: '',
    active: '',
    label: 'Verwarming',
    icon: 'mdi:radiator',
  },
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

const BHF_DOMAIN_CHOICES = [
  'sensor',
  'binary_sensor',
  'number',
  'input_number',
  'select',
  'switch',
  'climate',
  'water_heater',
];

function bhfDeepMerge(base, incoming) {
  const out = { ...base };
  for (const [key, value] of Object.entries(incoming || {})) {
    if (
      value
      && typeof value === 'object'
      && !Array.isArray(value)
      && typeof out[key] === 'object'
      && out[key] !== null
      && !Array.isArray(out[key])
    ) {
      out[key] = bhfDeepMerge(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

class BoilerHeatFlowCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement('boiler-heat-flow-card-editor');
  }

  static getStubConfig() {
    return structuredClone(BHF_DEFAULTS);
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = structuredClone(BHF_DEFAULTS);
    this._hass = undefined;
  }

  static get properties() {
    return { hass: {}, _config: {} };
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Config ontbreekt');
    }
    this._config = bhfDeepMerge(structuredClone(BHF_DEFAULTS), config);
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
    return {
      rows: 7,
      columns: 12,
      min_rows: 6,
      max_rows: 9,
      min_columns: 8,
      max_columns: 12,
    };
  }

  _getStateObj(entityId) {
    if (!entityId || !this._hass) return undefined;
    return this._hass.states[entityId];
  }

  _getNumeric(entityId) {
    const st = this._getStateObj(entityId);
    if (!st) return null;
    const num = Number.parseFloat(st.state);
    return Number.isFinite(num) ? num : null;
  }

  _isOn(entityId) {
    const st = this._getStateObj(entityId);
    if (!st) return false;
    const value = String(st.state).toLowerCase();
    return ['on', 'home', 'heat', 'heating', 'true', 'open', 'active', 'running'].includes(value);
  }

  _formatValue(entityId) {
    const st = this._getStateObj(entityId);
    if (!st) return '—';
    const unit = st.attributes?.unit_of_measurement || '';
    if (st.state === 'unknown' || st.state === 'unavailable') return st.state;
    const n = Number.parseFloat(st.state);
    if (Number.isFinite(n)) {
      const decimals = Math.abs(n) >= 100 ? 0 : 1;
      return `${n.toFixed(decimals)}${unit ? ` ${unit}` : ''}`;
    }
    return `${st.state}${unit ? ` ${unit}` : ''}`;
  }

  _temperatureColor(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return '#7c8aa5';
    if (value < 20) return '#4da3ff';
    if (value < 35) return '#3cc0ff';
    if (value < 50) return '#ffb547';
    if (value < 65) return '#ff7a45';
    return '#ff4d4d';
  }

  _boilerGradient(top, mid, bottom) {
    const c1 = this._temperatureColor(top);
    const c2 = this._temperatureColor(mid);
    const c3 = this._temperatureColor(bottom);
    return `linear-gradient(180deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`;
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
    const threshold = Number(this._config.thresholds?.[thresholdKey]);
    return temp !== null && Number.isFinite(threshold) ? temp >= threshold : false;
  }

  _fireEvent(type, detail, options = {}) {
    const event = new Event(type, {
      bubbles: options.bubbles ?? true,
      cancelable: options.cancelable ?? false,
      composed: options.composed ?? true,
    });
    event.detail = detail;
    this.dispatchEvent(event);
    return event;
  }

  _showMoreInfo(entityId) {
    if (!entityId) return;
    this._fireEvent('hass-more-info', { entityId });
  }

  _nodeTemplate(key, cfg, x, y, active, extraClass = '') {
    const num = this._getNumeric(cfg.entity);
    const value = this._formatValue(cfg.entity);
    const color = this._temperatureColor(num);
    return `
      <button class="node ${active ? 'active' : ''} ${extraClass}" style="left:${x}%; top:${y}%; --accent:${color};" data-entity="${cfg.entity || ''}">
        <div class="node-icon"><ha-icon icon="${cfg.icon || 'mdi:help-circle'}"></ha-icon></div>
        <div class="node-body">
          <div class="node-label">${cfg.label || key}</div>
          <div class="node-value">${value}</div>
        </div>
      </button>
    `;
  }

  _boilerLevel(value, min, max) {
    if (!Number.isFinite(value)) return 0.5;
    if (value <= min) return 0;
    if (value >= max) return 1;
    return (value - min) / (max - min);
  }

  _rightSideConfig() {
    const floorEnabled = Boolean(this._config.floor?.entity);
    const radiatorEnabled = Boolean(this._config.radiator?.entity);
    const legacyEnabled = Boolean(this._config.heating?.entity);

    if (!floorEnabled && !radiatorEnabled && legacyEnabled) {
      return [{
        key: 'heating',
        x: 86,
        y: 76,
        active: this._activeSection('heating', 'heating_temp'),
        pipe: { d: 'M77 76 L61 76 Q55 76 55 70 L55 62', colorClass: 'pipe-hot' },
      }];
    }

    const nodes = [];
    if (floorEnabled) {
      nodes.push({
        key: 'floor',
        x: 86,
        y: radiatorEnabled ? 68 : 76,
        active: this._activeSection('floor', 'floor_temp'),
        pipe: {
          d: radiatorEnabled ? 'M77 68 L61 68 Q55 68 55 63 L55 58' : 'M77 76 L61 76 Q55 76 55 70 L55 62',
          colorClass: 'pipe-hot',
        },
      });
    }
    if (radiatorEnabled) {
      nodes.push({
        key: 'radiator',
        x: 86,
        y: floorEnabled ? 82 : 76,
        active: this._activeSection('radiator', 'radiator_temp'),
        pipe: {
          d: floorEnabled ? 'M77 82 L61 82 Q55 82 55 75 L55 66' : 'M77 76 L61 76 Q55 76 55 70 L55 62',
          colorClass: 'pipe-red',
        },
      });
    }
    return nodes;
  }

  _render() {
    if (!this._config || !this.shadowRoot) return;

    const top = this._getNumeric(this._config.tank.top);
    const middle = this._getNumeric(this._config.tank.middle);
    const bottom = this._getNumeric(this._config.tank.bottom);

    const collectorActive = this._activeCollector();
    const hotwaterActive = this._activeSection('hotwater', 'hotwater_temp');
    const fireplaceActive = this._activeSection('fireplace', 'fireplace_temp');
    const heatpumpActive = this._activeSection('heatpump', 'heatpump_temp');
    const rightNodes = this._rightSideConfig();

    const avgBoiler = [top, middle, bottom].filter((v) => Number.isFinite(v));
    const avgTemp = avgBoiler.length ? avgBoiler.reduce((a, b) => a + b, 0) / avgBoiler.length : null;
    const fillLevel = this._boilerLevel(avgTemp, 15, 80);
    const fillHeight = `${20 + fillLevel * 65}%`;

    const rightNodeHtml = rightNodes.map((node) => {
      const cfg = this._config[node.key];
      return this._nodeTemplate(node.key, cfg, node.x, node.y, node.active);
    }).join('');

    const rightPipeHtml = rightNodes.map((node) => `
      <path class="pipe-bg" d="${node.pipe.d}" />
      <path class="pipe-glow" d="${node.pipe.d}" />
      <path class="pipe-active ${node.pipe.colorClass} ${node.active && this._config.animations ? 'on' : ''}" d="${node.pipe.d}" />
    `).join('');

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        ha-card {
          position: relative;
          overflow: hidden;
          min-height: 600px;
          border-radius: 24px;
          background:
            radial-gradient(circle at top, rgba(255,255,255,0.05), transparent 35%),
            linear-gradient(180deg, rgba(14,18,28,0.96), rgba(17,22,34,0.98));
          color: #edf3ff;
        }
        .wrap {
          position: relative;
          height: 600px;
          padding: 12px;
        }
        .title {
          position: absolute;
          left: 20px;
          top: 14px;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.02em;
          z-index: 3;
        }
        .subtle {
          position: absolute;
          right: 18px;
          top: 18px;
          font-size: 12px;
          color: #91a4c7;
          z-index: 3;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(20,27,41,0.55);
          border: 1px solid rgba(255,255,255,0.06);
        }
        svg.flow {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          pointer-events: none;
        }
        .pipe-bg {
          fill: none;
          stroke: rgba(135, 156, 194, 0.16);
          stroke-width: 10;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .pipe-glow {
          fill: none;
          stroke: rgba(123, 190, 255, 0.15);
          stroke-width: 16;
          filter: blur(8px);
        }
        .pipe-active {
          fill: none;
          stroke: var(--pipe-color, #69b7ff);
          stroke-width: 6;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 10 12;
          opacity: 0;
        }
        .pipe-active.on {
          opacity: 1;
          animation: flow 1.2s linear infinite;
        }
        .pipe-hot { --pipe-color: #ff9d42; }
        .pipe-red { --pipe-color: #ff6257; }
        .pipe-blue { --pipe-color: #52b6ff; }
        .pipe-green { --pipe-color: #7ee787; }
        @keyframes flow {
          to { stroke-dashoffset: -44; }
        }
        .node {
          position: absolute;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          gap: 12px;
          width: 220px;
          padding: 14px 16px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          background: rgba(20, 27, 41, 0.78);
          backdrop-filter: blur(10px);
          color: #edf3ff;
          box-shadow: 0 12px 30px rgba(0,0,0,0.28);
          cursor: pointer;
          z-index: 2;
          text-align: left;
        }
        .node:hover {
          border-color: rgba(255,255,255,0.16);
          transform: translate(-50%, -50%) scale(1.01);
        }
        .node.active {
          box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 60%, white 10%), 0 0 28px color-mix(in srgb, var(--accent) 35%, transparent);
        }
        .node-icon {
          flex: 0 0 48px;
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          background: color-mix(in srgb, var(--accent) 22%, rgba(255,255,255,0.04));
          color: var(--accent);
        }
        .node-icon ha-icon {
          --mdc-icon-size: 28px;
        }
        .node-label {
          font-size: 14px;
          color: #b9c6df;
          line-height: 1.2;
        }
        .node-value {
          margin-top: 4px;
          font-size: 20px;
          font-weight: 700;
          line-height: 1.2;
        }
        .boiler {
          position: absolute;
          left: 50%;
          top: 55%;
          transform: translate(-50%, -50%);
          width: 190px;
          height: 300px;
          border-radius: 86px;
          background: rgba(20,27,41,0.9);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08), 0 18px 40px rgba(0,0,0,0.30);
          z-index: 2;
          overflow: hidden;
          cursor: pointer;
        }
        .boiler-fill {
          position: absolute;
          left: 10px;
          right: 10px;
          bottom: 10px;
          height: ${fillHeight};
          border-radius: 76px;
          background: ${this._boilerGradient(top, middle, bottom)};
          opacity: 0.92;
          transition: height 400ms ease;
        }
        .boiler-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0.04) 35%, rgba(255,255,255,0.01));
          pointer-events: none;
        }
        .boiler-title {
          position: absolute;
          top: 18px;
          width: 100%;
          text-align: center;
          font-size: 22px;
          font-weight: 800;
          z-index: 2;
          text-shadow: 0 2px 14px rgba(0,0,0,0.35);
        }
        .boiler-avg {
          position: absolute;
          top: 50px;
          width: 100%;
          text-align: center;
          font-size: 13px;
          color: #e4ecfb;
          z-index: 2;
        }
        .boiler-temps {
          position: absolute;
          inset: 82px 18px 18px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          z-index: 2;
        }
        .temp-chip {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(10,14,22,0.35);
          border: 1px solid rgba(255,255,255,0.12);
          cursor: pointer;
        }
        .temp-chip:hover {
          background: rgba(10,14,22,0.46);
        }
        .temp-chip .label {
          font-size: 12px;
          color: #d8e2f4;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .temp-chip .value {
          font-size: 18px;
          font-weight: 700;
        }
        .legend {
          position: absolute;
          right: 16px;
          bottom: 12px;
          z-index: 2;
          color: #8fa2c5;
          font-size: 12px;
          display: flex;
          gap: 8px;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(20,27,41,0.6);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: linear-gradient(180deg, #52b6ff, #ff9d42);
        }
        @media (max-width: 860px) {
          .node { width: 190px; }
        }
      </style>
      <ha-card>
        <div class="wrap">
          <div class="title">${this._config.title || 'Warmtesysteem'}</div>
          <div class="subtle">v3</div>
          <svg class="flow" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path class="pipe-bg" d="M50 20 L50 41" />
            <path class="pipe-glow" d="M50 20 L50 41" />
            <path class="pipe-active pipe-hot ${collectorActive && this._config.animations ? 'on' : ''}" d="M50 20 L50 41" />

            <path class="pipe-bg" d="M23 33 L39 33 Q45 33 45 39 L45 42" />
            <path class="pipe-glow" d="M23 33 L39 33 Q45 33 45 39 L45 42" />
            <path class="pipe-active pipe-blue ${hotwaterActive && this._config.animations ? 'on' : ''}" d="M23 33 L39 33 Q45 33 45 39 L45 42" />

            <path class="pipe-bg" d="M23 54 L39 54 Q45 54 45 50 L45 48" />
            <path class="pipe-glow" d="M23 54 L39 54 Q45 54 45 50 L45 48" />
            <path class="pipe-active pipe-red ${fireplaceActive && this._config.animations ? 'on' : ''}" d="M23 54 L39 54 Q45 54 45 50 L45 48" />

            <path class="pipe-bg" d="M77 54 L61 54 Q55 54 55 50 L55 48" />
            <path class="pipe-glow" d="M77 54 L61 54 Q55 54 55 50 L55 48" />
            <path class="pipe-active pipe-green ${heatpumpActive && this._config.animations ? 'on' : ''}" d="M77 54 L61 54 Q55 54 55 50 L55 48" />

            ${rightPipeHtml}
          </svg>

          ${this._nodeTemplate('collector', this._config.collector, 50, 13, collectorActive, 'small-top')}
          ${this._nodeTemplate('hotwater', this._config.hotwater, 14, 31, hotwaterActive)}
          ${this._nodeTemplate('fireplace', this._config.fireplace, 14, 54, fireplaceActive)}
          ${this._nodeTemplate('heatpump', this._config.heatpump, 86, 54, heatpumpActive)}
          ${rightNodeHtml}

          <div class="boiler" data-entity="${this._config.tank.middle || this._config.tank.top || this._config.tank.bottom || ''}">
            <div class="boiler-fill"></div>
            <div class="boiler-overlay"></div>
            <div class="boiler-title">${this._config.tank.title || 'Boiler'}</div>
            <div class="boiler-avg">Gemiddeld: ${avgTemp === null ? '—' : `${avgTemp.toFixed(1)} °C`}</div>
            <div class="boiler-temps">
              <div class="temp-chip" data-entity="${this._config.tank.top || ''}">
                <span class="label">Boven</span>
                <span class="value">${this._formatValue(this._config.tank.top)}</span>
              </div>
              <div class="temp-chip" data-entity="${this._config.tank.middle || ''}">
                <span class="label">Midden</span>
                <span class="value">${this._formatValue(this._config.tank.middle)}</span>
              </div>
              <div class="temp-chip" data-entity="${this._config.tank.bottom || ''}">
                <span class="label">Onder</span>
                <span class="value">${this._formatValue(this._config.tank.bottom)}</span>
              </div>
            </div>
          </div>

          ${this._config.show_legend ? '<div class="legend"><span class="legend-dot"></span> warmteflow actief</div>' : ''}
        </div>
      </ha-card>
    `;

    this.shadowRoot.querySelectorAll('[data-entity]').forEach((el) => {
      el.addEventListener('click', () => {
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
    this._config = structuredClone(BHF_DEFAULTS);
    this._hass = undefined;
  }

  setConfig(config) {
    this._config = bhfDeepMerge(structuredClone(BHF_DEFAULTS), config || {});
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _value(path, fallback = '') {
    return path.split('.').reduce((acc, key) => acc?.[key], this._config) ?? fallback;
  }

  _entityOptions(preferredDomains = []) {
    const states = this._hass?.states || {};
    const ids = Object.keys(states).sort();
    const preferred = [];
    const rest = [];
    ids.forEach((id) => {
      if (preferredDomains.some((domain) => id.startsWith(`${domain}.`))) {
        preferred.push(id);
      } else if (!preferredDomains.length || BHF_DOMAIN_CHOICES.some((domain) => id.startsWith(`${domain}.`))) {
        rest.push(id);
      }
    });
    return [''].concat(preferred, rest);
  }

  _setPath(path, value) {
    const keys = path.split('.');
    const next = structuredClone(this._config || {});
    let ref = next;
    for (let i = 0; i < keys.length - 1; i += 1) {
      const k = keys[i];
      ref[k] = ref[k] || {};
      ref = ref[k];
    }
    ref[keys[keys.length - 1]] = value;
    this._config = next;
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: next },
      bubbles: true,
      composed: true,
    }));
    this._render();
  }

  _renderSelect(label, path, options, hint = '') {
    const value = String(this._value(path, ''));
    return `
      <label class="field">
        <span>${label}</span>
        <select data-path="${path}">
          ${options.map((option) => `<option value="${option}" ${String(option) === value ? 'selected' : ''}>${option || '— niet ingesteld —'}</option>`).join('')}
        </select>
        ${hint ? `<small>${hint}</small>` : ''}
      </label>
    `;
  }

  _renderInput(label, path, type = 'text', hint = '') {
    const value = this._value(path, '');
    return `
      <label class="field">
        <span>${label}</span>
        <input type="${type}" data-path="${path}" value="${value}">
        ${hint ? `<small>${hint}</small>` : ''}
      </label>
    `;
  }

  _renderCheckbox(label, path, hint = '') {
    const checked = Boolean(this._value(path, false));
    return `
      <label class="checkfield">
        <input type="checkbox" data-path="${path}" ${checked ? 'checked' : ''}>
        <div>
          <span>${label}</span>
          ${hint ? `<small>${hint}</small>` : ''}
        </div>
      </label>
    `;
  }

  _renderSection(title, inner) {
    return `<div class="section"><h3>${title}</h3><div class="grid">${inner}</div></div>`;
  }

  _render() {
    if (!this.shadowRoot) return;
    const tempOptions = this._entityOptions(['sensor', 'number', 'input_number']);
    const activeOptions = this._entityOptions(['binary_sensor', 'switch', 'climate', 'water_heater']);

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          padding: 8px 0 0;
        }
        .section {
          margin-bottom: 18px;
          padding: 14px;
          border-radius: 18px;
          background: rgba(var(--rgb-card-background-color, 28, 28, 28), 0.35);
          border: 1px solid rgba(var(--rgb-primary-text-color, 255,255,255), 0.08);
        }
        h3 {
          margin: 0 0 12px;
          font-size: 16px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field span,
        .checkfield span {
          font-size: 13px;
          font-weight: 600;
        }
        .field small,
        .checkfield small {
          color: var(--secondary-text-color);
          font-size: 12px;
        }
        .checkfield {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
        }
        input[type="text"],
        input[type="number"],
        select {
          box-sizing: border-box;
          width: 100%;
          min-height: 40px;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1px solid var(--divider-color);
          background: var(--card-background-color);
          color: var(--primary-text-color);
        }
        @media (max-width: 680px) {
          .grid { grid-template-columns: 1fr; }
        }
      </style>

      ${this._renderSection('Algemeen', `
        ${this._renderInput('Titel', 'title')}
        ${this._renderCheckbox('Animaties', 'animations', 'Laat warmteflow bewegen wanneer actief.')}
        ${this._renderCheckbox('Legenda tonen', 'show_legend', 'Toon rechtsonder de legenda.')}
      `)}

      ${this._renderSection('Boiler', `
        ${this._renderInput('Titel boiler', 'tank.title')}
        ${this._renderSelect('Boiler boven', 'tank.top', tempOptions)}
        ${this._renderSelect('Boiler midden', 'tank.middle', tempOptions)}
        ${this._renderSelect('Boiler onder', 'tank.bottom', tempOptions)}
      `)}

      ${this._renderSection('Zonnecollector', `
        ${this._renderSelect('Temperatuur entity', 'collector.entity', tempOptions)}
        ${this._renderSelect('Pomp / actief entity', 'collector.pump', activeOptions, 'Optioneel. Zonder pomp gebruikt de kaart het temperatuurverschil met boiler boven.')}
        ${this._renderInput('Label', 'collector.label')}
        ${this._renderInput('Icoon', 'collector.icon')}
      `)}

      ${this._renderSection('Tapwater', `
        ${this._renderSelect('Temperatuur entity', 'hotwater.entity', tempOptions)}
        ${this._renderSelect('Actief entity', 'hotwater.active', activeOptions, 'Optioneel. Anders gebruikt de kaart de temperatuur-drempel.')}
        ${this._renderInput('Label', 'hotwater.label')}
        ${this._renderInput('Icoon', 'hotwater.icon')}
      `)}

      ${this._renderSection('Openhaard', `
        ${this._renderSelect('Temperatuur entity', 'fireplace.entity', tempOptions)}
        ${this._renderSelect('Actief entity', 'fireplace.active', activeOptions)}
        ${this._renderInput('Label', 'fireplace.label')}
        ${this._renderInput('Icoon', 'fireplace.icon')}
      `)}

      ${this._renderSection('Warmtepomp', `
        ${this._renderSelect('Temperatuur entity', 'heatpump.entity', tempOptions)}
        ${this._renderSelect('Actief entity', 'heatpump.active', activeOptions)}
        ${this._renderInput('Label', 'heatpump.label')}
        ${this._renderInput('Icoon', 'heatpump.icon')}
      `)}

      ${this._renderSection('Vloerverwarming', `
        ${this._renderSelect('Temperatuur entity', 'floor.entity', tempOptions)}
        ${this._renderSelect('Actief entity', 'floor.active', activeOptions, 'Laat leeg als je deze zone niet wilt tonen.')}
        ${this._renderInput('Label', 'floor.label')}
        ${this._renderInput('Icoon', 'floor.icon')}
      `)}

      ${this._renderSection('Radiatoren', `
        ${this._renderSelect('Temperatuur entity', 'radiator.entity', tempOptions)}
        ${this._renderSelect('Actief entity', 'radiator.active', activeOptions, 'Laat leeg als je deze zone niet wilt tonen.')}
        ${this._renderInput('Label', 'radiator.label')}
        ${this._renderInput('Icoon', 'radiator.icon')}
      `)}

      ${this._renderSection('Legacy verwarming', `
        ${this._renderSelect('Temperatuur entity', 'heating.entity', tempOptions)}
        ${this._renderSelect('Actief entity', 'heating.active', activeOptions, 'Alleen nodig als je geen aparte vloer/radiator gebruikt.')}
        ${this._renderInput('Label', 'heating.label')}
        ${this._renderInput('Icoon', 'heating.icon')}
      `)}

      ${this._renderSection('Drempels', `
        ${this._renderInput('Collector delta t.o.v. boiler boven', 'thresholds.collector_delta', 'number')}
        ${this._renderInput('Openhaard temperatuur', 'thresholds.fireplace_temp', 'number')}
        ${this._renderInput('Warmtepomp temperatuur', 'thresholds.heatpump_temp', 'number')}
        ${this._renderInput('Tapwater temperatuur', 'thresholds.hotwater_temp', 'number')}
        ${this._renderInput('Vloerverwarming temperatuur', 'thresholds.floor_temp', 'number')}
        ${this._renderInput('Radiator temperatuur', 'thresholds.radiator_temp', 'number')}
        ${this._renderInput('Legacy verwarming temperatuur', 'thresholds.heating_temp', 'number')}
      `)}
    `;

    this.shadowRoot.querySelectorAll('input, select').forEach((el) => {
      el.addEventListener('change', (ev) => {
        const target = ev.currentTarget;
        const path = target.getAttribute('data-path');
        let value;
        if (target.type === 'checkbox') {
          value = target.checked;
        } else if (target.type === 'number') {
          value = target.value === '' ? '' : Number(target.value);
        } else {
          value = target.value;
        }
        this._setPath(path, value);
      });
    });
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
    documentationURL: 'https://github.com/yourname/boiler-heat-flow-card',
  });
}
