# Boiler Heat Flow Card

Custom Home Assistant Lovelace card for thermal flows between:

- Solar collector
- Boiler / buffer tank
- Fireplace
- Heat pump
- Heating circuit
- Hot water

## Features

- Animated heat-flow lines
- Boiler tank in the center with top / middle / bottom temperatures
- Visual editor in the dashboard UI
- Manual install or HACS custom repository install
- Click any node for more-info

## Install with HACS

1. Open **HACS**.
2. Go to **Frontend**.
3. Add this repository as a **Custom repository**.
4. Choose category **Dashboard**.
5. Install **Boiler Heat Flow Card**.
6. Refresh the browser.

## Manual install

1. Copy `dist/boiler-heat-flow-card.js` to:

   `/config/www/boiler-heat-flow-card.js`

2. Add resource:

   - URL: `/local/boiler-heat-flow-card.js`
   - Type: `module`

## Example YAML

```yaml
type: custom:boiler-heat-flow-card
title: Warmtesysteem
animations: true

tank:
  title: Boiler
  top: sensor.boiler_boven
  middle: sensor.boiler_midden
  bottom: sensor.boiler_onder

collector:
  entity: sensor.collector_temp
  pump: binary_sensor.collector_pomp
  label: Zonnecollector
  icon: mdi:white-balance-sunny

hotwater:
  entity: sensor.tapwater_temp
  active: binary_sensor.tapwater_actief
  label: Tapwater
  icon: mdi:water-boiler

fireplace:
  entity: sensor.openhaard_temp
  active: binary_sensor.openhaard_actief
  label: Openhaard
  icon: mdi:fireplace

heatpump:
  entity: sensor.warmtepomp_temp
  active: binary_sensor.warmtepomp_actief
  label: Warmtepomp
  icon: mdi:heat-pump

heating:
  entity: sensor.verwarming_temp
  active: binary_sensor.verwarming_actief
  label: Vloer/Radiator
  icon: mdi:radiator

thresholds:
  collector_delta: 5
  fireplace_temp: 45
  heatpump_temp: 30
  heating_temp: 25
  hotwater_temp: 30
```

## Notes

- `collector.pump` is optional.
- Any `active` entity is optional.
- If no active entity is configured, the card falls back to threshold-based logic.

## HACS repository layout

This repository is ready to publish as a custom frontend repository:

- `hacs.json`
- `dist/boiler-heat-flow-card.js`
- `README.md`
