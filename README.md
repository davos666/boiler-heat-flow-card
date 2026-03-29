# Boiler Heat Flow Card v3

Custom Home Assistant Lovelace card for thermal flows between:

- Solar collector
- Boiler / buffer tank
- Fireplace
- Heat pump
- Hot water
- Floor heating
- Radiators

## What changed in v3

- Fixed HACS resource path by shipping the main JS file in the repo root
- Keeps a copy in `dist/` for manual installs and releases
- Visual config editor in Home Assistant
- Separate support for **floor heating** and **radiators**
- Legacy single `heating:` section still supported
- Boiler now shows an average temperature line and visual fill level
- Legend can be turned on or off

## HACS install

1. Add this repo as a **Custom repository** in HACS
2. Type: **Dashboard**
3. Install **Boiler Heat Flow Card**
4. Refresh the browser

HACS should load:

```text
/hacsfiles/boiler-heat-flow-card/boiler-heat-flow-card.js
```

## Manual install

Copy one of these files to your HA `www` folder:

- `boiler-heat-flow-card.js`
- `dist/boiler-heat-flow-card.js`

Then add a resource:

```text
/local/boiler-heat-flow-card.js
```

Type:

```text
module
```

## Example YAML with separate floor and radiators

```yaml
type: custom:boiler-heat-flow-card
title: Warmtesysteem
animations: true
show_legend: true

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

floor:
  entity: sensor.vloerverwarming_temp
  active: binary_sensor.vloerverwarming_actief
  label: Vloerverwarming
  icon: mdi:heating-coil

radiator:
  entity: sensor.radiator_temp
  active: binary_sensor.radiator_actief
  label: Radiatoren
  icon: mdi:radiator

thresholds:
  collector_delta: 5
  fireplace_temp: 45
  heatpump_temp: 30
  hotwater_temp: 30
  floor_temp: 25
  radiator_temp: 30
```

## Example YAML with legacy heating only

```yaml
type: custom:boiler-heat-flow-card
title: Warmtesysteem

tank:
  title: Boiler
  top: sensor.boiler_boven
  middle: sensor.boiler_midden
  bottom: sensor.boiler_onder

collector:
  entity: sensor.collector_temp
  pump: binary_sensor.collector_pomp

hotwater:
  entity: sensor.tapwater_temp
  active: binary_sensor.tapwater_actief

fireplace:
  entity: sensor.openhaard_temp
  active: binary_sensor.openhaard_actief

heatpump:
  entity: sensor.warmtepomp_temp
  active: binary_sensor.warmtepomp_actief

heating:
  entity: sensor.verwarming_temp
  active: binary_sensor.verwarming_actief
  label: Vloer/Radiator
  icon: mdi:radiator
```

## Repo layout

- `boiler-heat-flow-card.js`
- `dist/boiler-heat-flow-card.js`
- `hacs.json`
- `README.md`
