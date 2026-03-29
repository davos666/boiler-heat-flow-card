class BoilerHeatFlowCard extends HTMLElement {
  static getStubConfig() {
    return {
      type: 'custom:boiler-heat-flow-card',
      title: 'Warmtesysteem',
      animations: true,
      show_legend: true,
      card_width: '100%',
      card_height: '560px',
      tank: {
        title: 'Boiler',
        top: '',
        middle: '',
        bottom: '',
      },
      collector: {
        entity: '',
        label: 'Zonnecollector',
        pump: '',
        icon: 'mdi:white-balance-sunny',
      },
      hotwater: {
        entity: '',
        active: '',
        flow_entity: '',
        flow_unit: 'l/min',
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
        supply_entity: '',
        return_entity: '',
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
      thresholds: {
        collector: { mode: 'delta', delta: 5 },
        fireplace: { mode: 'temp', temp: 45 },
        heatpump: { mode: 'temp', temp: 30 },
        hotwater: { mode: 'temp', temp: 30 },
        floor: { mode: 'temp', temp: 25 },
        radiator: { mode: 'temp', temp: 30 },
      },
    };
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = BoilerHeatFlowCard.getStubConfig();
    this._hass = null;
  }

  setConfig(config) {
    const base = BoilerHeatFlowCard.getStubConfig();
    this._config = {
      ...base,
      ...(config || {}),
      tank: { ...base.tank, ...(config?.tank || {}) },
      collector: { ...base.collector, ...(config?.collector || {}) },
      hotwater: { ...base.hotwater, ...(config?.hotwater || {}) },
      fireplace: { ...base.fireplace, ...(config?.fireplace || {}) },
      heatpump: { ...base.heatpump, ...(config?.heatpump || {}) },
      floor: { ...base.floor, ...(config?.floor || {}) },
      radiator: { ...base.radiator, ...(config?.radiator || {}) },
      thresholds: this._normalizeThresholds(config?.thresholds || {}),
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 6;
  }

  getGridOptions() {
    return {
      rows: 7,
      columns: 12,
      min_rows: 5,
      max_rows: 8,
      min_columns: 8,
      max_columns: 12,
    };
  }

  _normalizeThresholds(thresholds) {
    const defaults = BoilerHeatFlowCard.getStubConfig().thresholds;
    const normalized = {
      collector: { ...defaults.collector },
      fireplace: { ...defaults.fireplace },
      heatpump: { ...defaults.heatpump },
      hotwater: { ...defaults.hotwater },
      floor: { ...defaults.floor },
      radiator: { ...defaults.radiator },
    };

    const sections = ['collector', 'fireplace', 'heatpump', 'hotwater', 'floor', 'radiator'];
    sections.forEach((section) => {
      if (thresholds[section] && typeof thresholds[section] === 'object') {
        normalized[section] = {
          ...normalized[section],
          ...thresholds[section],
        };
      }
    });

    if (thresholds.collector_delta !== undefined) {
      normalized.collector = { mode: 'delta', delta: Number(thresholds.collector_delta || 0) };
    }
    if (thresholds.collector_temp !== undefined) {
      normalized.collector = { mode: 'temp', temp: Number(thresholds.collector_temp || 0) };
    }
    if (thresholds.fireplace_delta !== undefined) {
      normalized.fireplace = { mode: 'delta', delta: Number(thresholds.fireplace_delta || 0) };
    }
    if (thresholds.fireplace_temp !== undefined) {
      normalized.fireplace = { mode: 'temp', temp: Number(thresholds.fireplace_temp || 0) };
    }
    if (thresholds.heatpump_delta !== undefined) {
      normalized.heatpump = { mode: 'delta', delta: Number(thresholds.heatpump_delta || 0) };
    }
    if (thresholds.heatpump_temp !== undefined) {
      normalized.heatpump = { mode: 'temp', temp: Number(thresholds.heatpump_temp || 0) };
    }
    if (thresholds.hotwater_delta !== undefined) {
      normalized.hotwater = { mode: 'delta', delta: Number(thresholds.hotwater_delta || 0) };
    }
    if (thresholds.hotwater_temp !== undefined) {
      normalized.hotwater = { mode: 'temp', temp: Number(thresholds.hotwater_temp || 0) };
    }
    if (thresholds.floor_delta !== undefined) {
      normalized.floor = { mode: 'delta', delta: Number(thresholds.floor_delta || 0) };
    }
    if (thresholds.floor_temp !== undefined) {
      normalized.floor = { mode: 'temp', temp: Number(thresholds.floor_temp || 0) };
    }
    if (thresholds.radiator_delta !== undefined) {
      normalized.radiator = { mode: 'delta', delta: Number(thresholds.radiator_delta || 0) };
    }
    if (thresholds.radiator_temp !== undefined) {
      normalized.radiator = { mode: 'temp', temp: Number(thresholds.radiator_temp || 0) };
    }

    return normalized;
  }

  _getStateObj(entityId) {
    if (!entityId || !this._hass?.states) return undefined;
    return this._hass.states[entityId];
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
    return ['on', 'home', 'heat', 'heating', 'true', 'open', 'active'].includes(String(st.state).toLowerCase());
  }

  _formatValue(entityId) {
    const st = this._getStateObj(entityId);
    if (!st) return '—';
    if (['unknown', 'unavailable'].includes(st.state)) return st.state;
    const unit = st.attributes?.unit_of_measurement || '';
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

  _boilerGradient(top, middle, bottom) {
    return `linear-gradient(180deg, ${this._temperatureColor(top)} 0%, ${this._temperatureColor(middle)} 48%, ${this._temperatureColor(bottom)} 100%)`;
  }

  _thresholdActive(sectionName, sourceTemp, compareTemp) {
    const cfg = this._config.thresholds?.[sectionName] || {};
    if (sourceTemp === null) return false;
    if (cfg.mode === 'delta') {
      const delta = Number(cfg.delta || 0);
      return compareTemp !== null ? sourceTemp >= (compareTemp + delta) : false;
    }
    const temp = Number(cfg.temp || 0);
    return sourceTemp >= temp;
  }

  _activeCollector() {
    if (this._config.collector.pump) return this._isOn(this._config.collector.pump);
    return this._thresholdActive('collector', this._getNumeric(this._config.collector.entity), this._getNumeric(this._config.tank.top));
  }

  _activeSection(sectionName, compareToBoilerTop = false) {
    const sec = this._config[sectionName] || {};
    if (sec.active) return this._isOn(sec.active);
    if (sectionName === 'hotwater' && sec.flow_entity) {
      const flow = this._getNumeric(sec.flow_entity);
      if (flow !== null) return flow > 0;
    }
    const sourceTemp = this._getNumeric(sec.entity);
    const compareTemp = compareToBoilerTop ? this._getNumeric(this._config.tank.top) : this._getNumeric(this._config.tank.top);
    return this._thresholdActive(sectionName, sourceTemp, compareTemp);
  }

  _showMoreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent('hass-more-info', {
      detail: { entityId },
      bubbles: true,
      composed: true,
    }));
  }

  _nodeTemplate(cfg, x, y, active, entityOverride = '') {
    const entityId = entityOverride || cfg.entity;
    const num = this._getNumeric(entityId);
    const value = this._formatValue(entityId);
    const color = this._temperatureColor(num);
    return `
      <button class="node ${active ? 'active' : ''}" style="left:${x}%; top:${y}%; --accent:${color};" data-entity="${entityId || ''}">
        <div class="node-icon"><ha-icon icon="${cfg.icon || 'mdi:help-circle'}"></ha-icon></div>
        <div class="node-body">
          <div class="node-label">${cfg.label || ''}</div>
          <div class="node-value">${value}</div>
        </div>
      </button>
    `;
  }

  _pipeTemplate(id, d, colorClass, active, reverse = false) {
    const animate = active && this._config.animations !== false;
    return `
      <path class="pipe-bg" d="${d}" />
      <path class="pipe-glow ${animate ? 'on' : ''}" d="${d}" />
      <path id="${id}" class="pipe-active ${colorClass} ${active ? 'on' : ''}" d="${d}" />
      ${animate ? `
        <circle class="flow-dot ${colorClass}" r="2.9">
          <animateMotion dur="1.8s" repeatCount="indefinite" rotate="auto">
            <mpath href="#${id}"></mpath>
          </animateMotion>
        </circle>
        <circle class="flow-dot ${colorClass} delay-1" r="2.9">
          <animateMotion dur="1.8s" begin="-0.6s" repeatCount="indefinite" rotate="auto">
            <mpath href="#${id}"></mpath>
          </animateMotion>
        </circle>
        <circle class="flow-dot ${colorClass} delay-2" r="2.9">
          <animateMotion dur="1.8s" begin="-1.2s" repeatCount="indefinite" rotate="auto">
            <mpath href="#${id}"></mpath>
          </animateMotion>
        </circle>
      ` : ''}
      ${animate && reverse ? `
        <circle class="flow-dot ${colorClass}" r="2.9">
          <animateMotion dur="1.8s" repeatCount="indefinite" rotate="auto-reverse" keyPoints="1;0" keyTimes="0;1" calcMode="linear">
            <mpath href="#${id}"></mpath>
          </animateMotion>
        </circle>
      ` : ''}
    `;
  }

  _render() {
    if (!this.shadowRoot || !this._config) return;

    const top = this._getNumeric(this._config.tank.top);
    const middle = this._getNumeric(this._config.tank.middle);
    const bottom = this._getNumeric(this._config.tank.bottom);

    const collectorActive = this._activeCollector();
    const hotwaterActive = this._activeSection('hotwater');
    const fireplaceActive = this._activeSection('fireplace');
    const heatpumpActive = this._activeSection('heatpump');
    const floorActive = this._activeSection('floor');
    const radiatorActive = this._activeSection('radiator');

    const cardHeight = this._config.card_height || '560px';
    const cardWidth = this._config.card_width || '100%';

    const hpMainEntity = this._config.heatpump.supply_entity || this._config.heatpump.entity;
    const hpReturnEntity = this._config.heatpump.return_entity || this._config.heatpump.entity;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          position: relative;
          overflow: hidden;
          width: ${cardWidth};
          min-height: ${cardHeight};
          border-radius: 24px;
          background:
            radial-gradient(circle at top, rgba(255,255,255,0.05), transparent 32%),
            linear-gradient(180deg, rgba(14,18,28,0.98), rgba(17,22,34,1));
          color: #edf3ff;
        }
        .wrap {
          position: relative;
          min-height: ${cardHeight};
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
          stroke-width: 8;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .pipe-glow {
          fill: none;
          stroke-width: 12;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: 0;
          filter: blur(5px);
        }
        .pipe-glow.on { opacity: 0.28; }
        .pipe-active {
          fill: none;
          stroke-width: 3.8;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: 0.35;
        }
        .pipe-active.on { opacity: 1; }
        .pipe-hot { stroke: #ffab4c; }
        .pipe-red { stroke: #ff7b5c; }
        .pipe-blue { stroke: #57b9ff; }
        .pipe-green { stroke: #7ee787; }
        .flow-dot { filter: drop-shadow(0 0 6px currentColor); }
        .flow-dot.pipe-hot, .flow-dot.pipe-hot * { color: #ffab4c; fill: #ffab4c; }
        .flow-dot.pipe-red, .flow-dot.pipe-red * { color: #ff7b5c; fill: #ff7b5c; }
        .flow-dot.pipe-blue, .flow-dot.pipe-blue * { color: #57b9ff; fill: #57b9ff; }
        .flow-dot.pipe-green, .flow-dot.pipe-green * { color: #7ee787; fill: #7ee787; }
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
          background: rgba(20, 27, 41, 0.82);
          color: #edf3ff;
          box-shadow: 0 12px 30px rgba(0,0,0,0.28);
          cursor: pointer;
          z-index: 2;
          text-align: left;
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
        .node-icon ha-icon { --mdc-icon-size: 28px; }
        .node-label { font-size: 14px; color: #b9c6df; line-height: 1.2; }
        .node-value { margin-top: 4px; font-size: 20px; font-weight: 700; line-height: 1.2; }
        .boiler {
          position: absolute;
          left: 50%;
          top: 54%;
          transform: translate(-50%, -50%);
          width: 180px;
          height: 280px;
          border-radius: 80px;
          background: rgba(20,27,41,0.92);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08), 0 18px 40px rgba(0,0,0,0.30);
          z-index: 2;
          overflow: hidden;
        }
        .boiler-fill {
          position: absolute;
          inset: 10px;
          border-radius: 72px;
          background: ${this._boilerGradient(top, middle, bottom)};
          opacity: 0.88;
        }
        .boiler-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.02) 35%, rgba(255,255,255,0.01));
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
        .boiler-temps {
          position: absolute;
          inset: 64px 18px 18px;
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
        .temp-chip .label {
          font-size: 12px;
          color: #d8e2f4;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .temp-chip .value { font-size: 18px; font-weight: 700; }
        .legend {
          position: absolute;
          right: 16px;
          bottom: 12px;
          z-index: 2;
          color: #8fa2c5;
          font-size: 12px;
          display: ${this._config.show_legend === false ? 'none' : 'flex'};
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
          background: linear-gradient(180deg, #57b9ff, #ffab4c);
        }
      </style>
      <ha-card>
        <div class="wrap">
          <div class="title">${this._config.title || 'Warmtesysteem'}</div>
          <svg class="flow" viewBox="0 0 100 100" preserveAspectRatio="none">
            ${this._pipeTemplate('pipe-collector', 'M50 20 L50 41', 'pipe-hot', collectorActive)}
            ${this._pipeTemplate('pipe-hotwater', 'M23 33 L39 33 Q45 33 45 39 L45 42', 'pipe-blue', hotwaterActive)}
            ${this._pipeTemplate('pipe-fireplace', 'M23 54 L39 54 Q45 54 45 50 L45 48', 'pipe-red', fireplaceActive)}
            ${this._pipeTemplate('pipe-hp-supply', 'M77 50 L61 50 Q55 50 55 48', 'pipe-green', heatpumpActive)}
            ${this._pipeTemplate('pipe-hp-return', 'M77 58 L61 58 Q55 58 55 52', 'pipe-green', heatpumpActive)}
            ${this._pipeTemplate('pipe-floor', 'M77 72 L61 72 Q55 72 55 66 L55 62', 'pipe-hot', floorActive)}
            ${this._pipeTemplate('pipe-radiator', 'M77 80 L61 80 Q55 80 55 72 L55 66', 'pipe-hot', radiatorActive)}
          </svg>

          ${this._nodeTemplate(this._config.collector, 50, 13, collectorActive)}
          ${this._nodeTemplate(this._config.hotwater, 14, 31, hotwaterActive, this._config.hotwater.flow_entity || this._config.hotwater.entity)}
          ${this._nodeTemplate(this._config.fireplace, 14, 54, fireplaceActive)}
          ${this._nodeTemplate(this._config.heatpump, 86, 54, heatpumpActive, hpMainEntity)}
          ${this._nodeTemplate(this._config.floor, 86, 72, floorActive)}
          ${this._nodeTemplate(this._config.radiator, 86, 82, radiatorActive)}

          <div class="boiler">
            <div class="boiler-fill"></div>
            <div class="boiler-overlay"></div>
            <div class="boiler-title">${this._config.tank.title || 'Boiler'}</div>
            <div class="boiler-temps">
              <div class="temp-chip" data-entity="${this._config.tank.top || ''}"><span class="label">Boven</span><span class="value">${this._formatValue(this._config.tank.top)}</span></div>
              <div class="temp-chip" data-entity="${this._config.tank.middle || ''}"><span class="label">Midden</span><span class="value">${this._formatValue(this._config.tank.middle)}</span></div>
              <div class="temp-chip" data-entity="${this._config.tank.bottom || ''}"><span class="label">Onder</span><span class="value">${this._formatValue(this._config.tank.bottom)}</span></div>
            </div>
          </div>

          <div class="legend"><span class="legend-dot"></span> warmteflow actief</div>
        </div>
      </ha-card>
    `;

    this.shadowRoot.querySelectorAll('[data-entity]').forEach((el) => {
      el.addEventListener('click', () => this._showMoreInfo(el.getAttribute('data-entity')));
    });
  }
}

if (!customElements.get('boiler-heat-flow-card')) {
  customElements.define('boiler-heat-flow-card', BoilerHeatFlowCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.find((card) => card.type === 'boiler-heat-flow-card')) {
  window.customCards.push({
    type: 'boiler-heat-flow-card',
    name: 'Boiler Heat Flow Card',
    description: 'Thermische flow kaart voor collector, boiler, openhaard, warmtepomp en verwarming.',
    preview: true,
    documentationURL: 'https://github.com/davos666/boiler-heat-flow-card',
  });
}
