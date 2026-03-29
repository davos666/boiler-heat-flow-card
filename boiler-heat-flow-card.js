
const BoilerHeatFlowCardVersion = "1.1.7";
let boilerHeatFlowCardInstance = 0;

class BoilerHeatFlowCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._instanceId = `bhfc-${++boilerHeatFlowCardInstance}`;
  }

  static getStubConfig() {
    return {
      type: "custom:boiler-heat-flow-card",
      title: "Warmtesysteem",
      animations: true,
      show_legend: true,
      card_width: "100%",
      card_height: "560px",
      min_height: "560px",
      center_no_grid: true,
      tank: { title: "Boiler" },
    };
  }

  setConfig(config) {
    this._config = { ...(config || {}) };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 6;
  }

  _state(entityId) {
    if (!entityId || !this._hass?.states) return null;
    return this._hass.states[entityId] || null;
  }

  _num(entityId, fallback = null) {
    const st = this._state(entityId);
    if (!st) return fallback;
    const n = Number.parseFloat(st.state);
    return Number.isFinite(n) ? n : fallback;
  }

  _isOn(entityId) {
    const st = this._state(entityId);
    if (!st) return false;
    const value = String(st.state || "").toLowerCase();
    return ["on", "home", "heat", "heating", "true"].includes(value);
  }

  _fmtTemp(entityId) {
    const st = this._state(entityId);
    if (!st) return "—";
    const n = this._num(entityId, null);
    if (n === null) return st.state;
    const unit = st.attributes?.unit_of_measurement || "°C";
    return `${n.toFixed(1)}${unit}`;
  }

  _fmtValue(entityId, fallbackUnit = "") {
    const st = this._state(entityId);
    if (!st) return "—";
    const n = this._num(entityId, null);
    if (n === null) return st.state;
    const unit = st.attributes?.unit_of_measurement || fallbackUnit;
    return `${n.toFixed(1)}${unit}`;
  }

  _tempColor(v) {
    if (!Number.isFinite(v)) return "#94a3b8";
    if (v < 20) return "#60a5fa";
    if (v < 35) return "#22c55e";
    if (v < 50) return "#f59e0b";
    return "#ef4444";
  }

  _normalizeThresholds() {
    const t = this._config.thresholds || {};
    const normalized = {
      collector: { mode: "delta", delta: 5 },
      fireplace: { mode: "temp", temp: 45 },
      heatpump: { mode: "temp", temp: 30 },
      hotwater: { mode: "temp", temp: 30 },
      floor: { mode: "temp", temp: 25 },
      radiator: { mode: "temp", temp: 30 },
    };

    for (const key of Object.keys(normalized)) {
      if (t[key] && typeof t[key] === "object") {
        normalized[key] = { ...normalized[key], ...t[key] };
      }
    }

    const keys = ["collector", "fireplace", "heatpump", "hotwater", "floor", "radiator"];
    for (const key of keys) {
      if (Number.isFinite(Number(t[`${key}_delta`]))) normalized[key] = { mode: "delta", delta: Number(t[`${key}_delta`]) };
      if (Number.isFinite(Number(t[`${key}_temp`]))) normalized[key] = { mode: "temp", temp: Number(t[`${key}_temp`]) };
    }
    return normalized;
  }

  _isThresholdActive(kind, entityId, boilerTop) {
    const sourceTemp = this._num(entityId, null);
    if (!Number.isFinite(sourceTemp)) return false;
    const thr = this._normalizeThresholds()[kind] || {};
    if (thr.mode === "delta") {
      const delta = Number.isFinite(Number(thr.delta)) ? Number(thr.delta) : 0;
      return Number.isFinite(boilerTop) ? sourceTemp >= boilerTop + delta : false;
    }
    const temp = Number.isFinite(Number(thr.temp)) ? Number(thr.temp) : 0;
    return sourceTemp >= temp;
  }

  _sourceActive(kind, cfg, boilerTop) {
    if (!cfg) return false;
    if (kind === "collector" && cfg.pump && this._isOn(cfg.pump)) return true;
    if (cfg.active && this._isOn(cfg.active)) return true;
    if (kind === "hotwater" && cfg.flow_entity) {
      const flow = this._num(cfg.flow_entity, 0);
      if (flow > 0) return true;
    }
    return this._isThresholdActive(kind, cfg.entity, boilerTop);
  }

  _tapSubLabel(cfg) {
    if (!cfg) return "";
    if (cfg.flow_entity) return this._fmtValue(cfg.flow_entity, cfg.flow_unit || "");
    if (cfg.active) return this._isOn(cfg.active) ? "Actief" : "Uit";
    return "";
  }

  _entityForMoreInfo(cfg, fallback) {
    return cfg?.entity || cfg?.top || fallback || "";
  }

  _dispatchMoreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      bubbles: true,
      composed: true,
      detail: { entityId },
    }));
  }

  _dotPath(pathId, color, dur, active) {
    if (!active || this._config.animations === false) return "";
    return `
      <circle r="4" fill="${color}" filter="url(#${this._instanceId}-dot-glow)" opacity="0">
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.06;0.94;1" dur="${dur}" repeatCount="indefinite"></animate>
        <animateMotion dur="${dur}" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear" rotate="auto">
          <mpath href="#${pathId}"></mpath>
        </animateMotion>
      </circle>
    `;
  }

  _pipe(id, d, state) {
    return `
      <path class="pipe-base" d="${d}"></path>
      <path id="${id}" class="pipe-flow ${state}" d="${d}"></path>
    `;
  }

  _node(cfg, className, value, subLabel = "", color = "#64748b") {
    const label = cfg?.label || "";
    const icon = cfg?.icon || "mdi:thermometer";
    const entityId = this._entityForMoreInfo(cfg, cfg?.entity);
    return `
      <button class="node ${className}" data-entity="${entityId}">
        <div class="node-top">
          <ha-icon icon="${icon}" style="color:${color}"></ha-icon>
          <span class="node-title">${label}</span>
        </div>
        <div class="node-value">${value}</div>
        ${subLabel ? `<div class="node-sub">${subLabel}</div>` : ""}
      </button>
    `;
  }

  _render() {
    const cfg = this._config || {};
    const width = cfg.card_width || "100%";
    const height = cfg.card_height || "560px";
    const minHeight = cfg.min_height || "560px";

    const tank = cfg.tank || {};
    const collector = cfg.collector || {};
    const hotwater = cfg.hotwater || {};
    const fireplace = cfg.fireplace || {};
    const heatpump = cfg.heatpump || {};
    const floor = cfg.floor || {};
    const radiator = cfg.radiator || {};

    const topTemp = this._num(tank.top, null);
    const midTemp = this._num(tank.middle, null);
    const bottomTemp = this._num(tank.bottom, null);
    const tempList = [topTemp, midTemp, bottomTemp].filter(Number.isFinite);
    const avgTemp = tempList.length ? tempList.reduce((a, b) => a + b, 0) / tempList.length : null;
    const levelPct = Number.isFinite(avgTemp) ? Math.max(8, Math.min(92, (avgTemp / 80) * 100)) : 50;

    const activeCollector = this._sourceActive("collector", collector, topTemp);
    const activeHotwater = this._sourceActive("hotwater", hotwater, topTemp);
    const activeFireplace = this._sourceActive("fireplace", fireplace, topTemp);
    const activeHeatpump = this._sourceActive("heatpump", heatpump, topTemp);
    const activeFloor = this._sourceActive("floor", floor, topTemp);
    const activeRadiator = this._sourceActive("radiator", radiator, topTemp);

    const hpSupply = heatpump.supply_entity ? this._fmtTemp(heatpump.supply_entity) : "";
    const hpReturn = heatpump.return_entity ? this._fmtTemp(heatpump.return_entity) : "";
    const tankColor = this._tempColor(avgTemp);

    // All coordinates use the same 1000x600 system as the SVG.
    // Nodes are also placed with matching percentages so scaling stays aligned.
    const paths = {
      collector_fwd: "M 500 108 C 500 122, 500 138, 500 152",
      collector_ret: "M 520 152 C 520 138, 520 122, 520 108",

      hotwater_fwd: "M 170 150 C 250 150, 310 150, 360 150 S 420 172, 420 228",
      hotwater_ret: "M 420 248 C 420 210, 392 188, 350 170 S 260 170, 170 170",

      fireplace_fwd: "M 170 300 C 250 300, 320 300, 370 300 S 410 294, 420 288",
      fireplace_ret: "M 420 312 C 410 318, 398 320, 370 320 S 250 320, 170 320",

      heatpump_fwd: "M 830 300 C 760 300, 690 300, 640 300 S 600 294, 580 288",
      heatpump_ret: "M 580 312 C 600 318, 620 320, 650 320 S 760 320, 830 320",

      floor_fwd: "M 830 430 C 760 430, 690 430, 640 430 S 600 422, 580 418",
      floor_ret: "M 580 442 C 600 450, 620 460, 650 460 S 760 460, 830 460",

      radiator_fwd: "M 830 520 C 760 520, 690 520, 640 520 S 600 492, 580 478",
      radiator_ret: "M 580 502 C 600 516, 620 540, 650 550 S 760 550, 830 550",
    };

    const dots = [
      this._dotPath(`${this._instanceId}-collector-fwd`, "#f59e0b", "2.0s", activeCollector),
      this._dotPath(`${this._instanceId}-collector-ret`, "#38bdf8", "2.0s", activeCollector),
      this._dotPath(`${this._instanceId}-hotwater-fwd`, "#f59e0b", "2.1s", activeHotwater),
      this._dotPath(`${this._instanceId}-hotwater-ret`, "#38bdf8", "2.1s", activeHotwater),
      this._dotPath(`${this._instanceId}-fireplace-fwd`, "#f59e0b", "2.3s", activeFireplace),
      this._dotPath(`${this._instanceId}-fireplace-ret`, "#38bdf8", "2.3s", activeFireplace),
      this._dotPath(`${this._instanceId}-heatpump-fwd`, "#f59e0b", "2.2s", activeHeatpump),
      this._dotPath(`${this._instanceId}-heatpump-ret`, "#38bdf8", "2.2s", activeHeatpump),
      this._dotPath(`${this._instanceId}-floor-fwd`, "#f59e0b", "2.0s", activeFloor),
      this._dotPath(`${this._instanceId}-floor-ret`, "#38bdf8", "2.0s", activeFloor),
      this._dotPath(`${this._instanceId}-radiator-fwd`, "#f59e0b", "2.0s", activeRadiator),
      this._dotPath(`${this._instanceId}-radiator-ret`, "#38bdf8", "2.0s", activeRadiator),
    ].join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        ha-card {
          overflow: hidden;
          border-radius: 24px;
          background: transparent;
        }
        .wrap {
          position: relative;
          width: ${width};
          height: ${height};
          min-height: ${minHeight};
          color: var(--primary-text-color);
          background:
            radial-gradient(circle at top, rgba(255,255,255,0.04), transparent 28%),
            linear-gradient(180deg, rgba(15,23,42,0.98), rgba(2,6,23,0.99));
        }
        svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .pipe-base {
          fill: none;
          stroke: rgba(148,163,184,0.20);
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .pipe-flow {
          fill: none;
          stroke-width: 2.3;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .pipe-flow.idle {
          stroke: rgba(148,163,184,0.52);
        }
        .pipe-flow.supply-active {
          stroke: #f59e0b;
          filter: drop-shadow(0 0 3px rgba(245,158,11,0.32));
        }
        .pipe-flow.return-active {
          stroke: #38bdf8;
          filter: drop-shadow(0 0 3px rgba(56,189,248,0.32));
        }

        .tank {
          position: absolute;
          left: 50%;
          top: 54%;
          transform: translate(-50%, -50%);
          width: 16%;
          height: 48.3333%;
          min-width: 138px;
          min-height: 250px;
          border-radius: 42px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)),
            linear-gradient(180deg, rgba(30,41,59,0.95), rgba(15,23,42,0.98));
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 14px 38px rgba(0,0,0,0.28);
          cursor: pointer;
        }
        .tank-fill {
          position: absolute;
          left: 10%;
          right: 10%;
          bottom: 5.5%;
          height: ${levelPct}%;
          border-radius: 28px;
          background:
            linear-gradient(180deg, rgba(125,211,252,0.26), rgba(59,130,246,0.50)),
            linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.00));
          box-shadow: inset 0 8px 20px rgba(255,255,255,0.08), inset 0 -12px 20px rgba(30,64,175,0.18);
        }
        .tank-fill::before {
          content: "";
          position: absolute;
          left: 8%;
          right: 8%;
          top: 8px;
          height: 10px;
          border-radius: 999px;
          background: rgba(255,255,255,0.14);
        }
        .tank-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(255,255,255,0.05), transparent 24%, transparent 76%, rgba(255,255,255,0.04));
          pointer-events: none;
        }
        .tank-content {
          position: absolute;
          inset: 0;
          display: grid;
          grid-template-rows: auto 1fr auto;
          padding: 18px 18px 16px;
          z-index: 2;
        }
        .tank-title { text-align: center; font-size: 18px; font-weight: 700; margin-bottom: 8px; }
        .tank-temps { display: grid; gap: 8px; align-content: center; }
        .tank-row {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          padding: 7px 10px;
          border-radius: 12px;
          background: rgba(255,255,255,0.05);
        }
        .tank-avg { text-align: center; font-size: 13px; color: var(--secondary-text-color); }

        .node {
          position: absolute;
          width: 17%;
          min-width: 150px;
          max-width: 190px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          background: rgba(15,23,42,0.86);
          color: var(--primary-text-color);
          box-shadow: 0 10px 28px rgba(0,0,0,0.22);
          padding: 12px 14px;
          text-align: left;
          cursor: pointer;
        }
        .node-top { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .node-title { font-weight: 700; font-size: 14px; }
        .node-value { font-size: 18px; font-weight: 700; line-height: 1.2; }
        .node-sub { margin-top: 4px; color: var(--secondary-text-color); font-size: 12px; }

        .collector { left: 41.5%; top: 3%; transform: translateX(-50%); }
        .hotwater { left: 3.8%; top: 16%; }
        .fireplace { left: 3.8%; top: 41%; }
        .heatpump { right: 3.8%; top: 41%; }
        .floor { right: 3.8%; top: 63.5%; }
        .radiator { right: 3.8%; top: 78%; }

        .legend {
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 14px;
          display: flex;
          gap: 18px;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: var(--secondary-text-color);
        }
        .legend-item { display: inline-flex; align-items: center; gap: 8px; }
        .legend-line {
          width: 28px;
          height: 2px;
          border-radius: 2px;
          position: relative;
          background: rgba(255,255,255,0.3);
        }
        .legend-line.orange::after, .legend-line.blue::after {
          content: "";
          position: absolute;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          left: 10px;
          top: -3px;
        }
        .legend-line.orange::after { background: #f59e0b; }
        .legend-line.blue::after { background: #38bdf8; }

        @media (max-width: 900px) {
          .wrap { min-height: max(${minHeight}, 760px); }
          .node { width: 150px; }
          .collector { left: 50%; }
          .hotwater, .fireplace { left: 20px; }
          .heatpump, .floor, .radiator { right: 20px; }
        }
      </style>

      <ha-card>
        <div class="wrap">
          <svg viewBox="0 0 1000 600" preserveAspectRatio="none">
            <defs>
              <filter id="${this._instanceId}-dot-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="1.5" result="blur"></feGaussianBlur>
                <feMerge>
                  <feMergeNode in="blur"></feMergeNode>
                  <feMergeNode in="SourceGraphic"></feMergeNode>
                </feMerge>
              </filter>
            </defs>

            ${this._pipe(`${this._instanceId}-collector-fwd`, paths.collector_fwd, activeCollector ? "supply-active" : "idle")}
            ${this._pipe(`${this._instanceId}-collector-ret`, paths.collector_ret, activeCollector ? "return-active" : "idle")}
            ${this._pipe(`${this._instanceId}-hotwater-fwd`, paths.hotwater_fwd, activeHotwater ? "supply-active" : "idle")}
            ${this._pipe(`${this._instanceId}-hotwater-ret`, paths.hotwater_ret, activeHotwater ? "return-active" : "idle")}
            ${this._pipe(`${this._instanceId}-fireplace-fwd`, paths.fireplace_fwd, activeFireplace ? "supply-active" : "idle")}
            ${this._pipe(`${this._instanceId}-fireplace-ret`, paths.fireplace_ret, activeFireplace ? "return-active" : "idle")}
            ${this._pipe(`${this._instanceId}-heatpump-fwd`, paths.heatpump_fwd, activeHeatpump ? "supply-active" : "idle")}
            ${this._pipe(`${this._instanceId}-heatpump-ret`, paths.heatpump_ret, activeHeatpump ? "return-active" : "idle")}
            ${this._pipe(`${this._instanceId}-floor-fwd`, paths.floor_fwd, activeFloor ? "supply-active" : "idle")}
            ${this._pipe(`${this._instanceId}-floor-ret`, paths.floor_ret, activeFloor ? "return-active" : "idle")}
            ${this._pipe(`${this._instanceId}-radiator-fwd`, paths.radiator_fwd, activeRadiator ? "supply-active" : "idle")}
            ${this._pipe(`${this._instanceId}-radiator-ret`, paths.radiator_ret, activeRadiator ? "return-active" : "idle")}

            ${dots}
          </svg>

          ${this._node(collector, "collector", this._fmtTemp(collector.entity), collector.pump ? (this._isOn(collector.pump) ? "Pomp actief" : "Pomp uit") : "", this._tempColor(this._num(collector.entity, null)))}
          ${this._node(hotwater, "hotwater", this._fmtTemp(hotwater.entity), this._tapSubLabel(hotwater), this._tempColor(this._num(hotwater.entity, null)))}
          ${this._node(fireplace, "fireplace", this._fmtTemp(fireplace.entity), fireplace.active ? (this._isOn(fireplace.active) ? "Pomp actief" : "Pomp uit") : "", this._tempColor(this._num(fireplace.entity, null)))}
          ${this._node(heatpump, "heatpump", this._fmtTemp(heatpump.entity), [hpSupply ? `Aanvoer ${hpSupply}` : "", hpReturn ? `Retour ${hpReturn}` : ""].filter(Boolean).join(" • "), this._tempColor(this._num(heatpump.entity, null)))}
          ${this._node(floor, "floor", this._fmtTemp(floor.entity), floor.active ? (this._isOn(floor.active) ? "Actief" : "Uit") : "", this._tempColor(this._num(floor.entity, null)))}
          ${this._node(radiator, "radiator", this._fmtTemp(radiator.entity), radiator.active ? (this._isOn(radiator.active) ? "Actief" : "Uit") : "", this._tempColor(this._num(radiator.entity, null)))}

          <button class="tank" data-entity="${this._entityForMoreInfo(tank, tank.top)}" title="${tank.title || "Boiler"}">
            <div class="tank-fill"></div>
            <div class="tank-overlay"></div>
            <div class="tank-content">
              <div class="tank-title">${tank.title || "Boiler"}</div>
              <div class="tank-temps">
                <div class="tank-row"><span>Boven</span><strong>${this._fmtTemp(tank.top)}</strong></div>
                <div class="tank-row"><span>Midden</span><strong>${this._fmtTemp(tank.middle)}</strong></div>
                <div class="tank-row"><span>Onder</span><strong>${this._fmtTemp(tank.bottom)}</strong></div>
              </div>
              <div class="tank-avg">Gemiddeld: <span style="color:${tankColor}; font-weight:700">${Number.isFinite(avgTemp) ? avgTemp.toFixed(1) + "°C" : "—"}</span></div>
            </div>
          </button>

          ${cfg.show_legend === false ? "" : `
            <div class="legend">
              <span class="legend-item"><span class="legend-line orange"></span> Aanvoer</span>
              <span class="legend-item"><span class="legend-line blue"></span> Retour</span>
            </div>
          `}
        </div>
      </ha-card>
    `;

    this.shadowRoot.querySelectorAll("[data-entity]").forEach((el) => {
      el.addEventListener("click", () => this._dispatchMoreInfo(el.dataset.entity));
    });
  }
}

if (!customElements.get("boiler-heat-flow-card")) {
  customElements.define("boiler-heat-flow-card", BoilerHeatFlowCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.find((c) => c.type === "boiler-heat-flow-card")) {
  window.customCards.push({
    type: "boiler-heat-flow-card",
    name: "Boiler Heat Flow Card",
    description: "Thermal flow card for boiler, collector, fireplace, heat pump, floor heating, radiators and hot water.",
    documentationURL: "https://github.com/davos666/boiler-heat-flow-card",
  });
}
