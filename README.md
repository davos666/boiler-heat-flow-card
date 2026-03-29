# Boiler Heat Flow Card

A Home Assistant Lovelace custom card for visualizing thermal energy flow between a boiler and heat sources.

## Features

- Solar collector
- Fireplace
- Heat pump
- Hot water
- Floor heating
- Radiators
- Boiler tank with top / middle / bottom temperatures
- Supply and return lines
- One smooth moving dot per active line
- Orange supply / blue return
- YAML-only configuration
- HACS-ready

## HACS

Add this repository as a custom Dashboard repository.

Resource:

`/hacsfiles/boiler-heat-flow-card/boiler-heat-flow-card.js`

## Example

```yaml
type: custom:boiler-heat-flow-card
title: Warmtesysteem
animations: true
show_legend: true
card_width: 100%
card_height: 560px

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
  flow_entity: sensor.tapwater_flow
  flow_unit: l/min
  active: binary_sensor.tapwater_actief
  label: Tapwater
  icon: mdi:water-boiler

fireplace:
  entity: sensor.openhaard_nr
  active: binary_sensor.haardpomp
  label: Openhaard
  icon: mdi:fireplace

heatpump:
  entity: sensor.warmtepomp_temp
  supply_entity: sensor.warmtepomp_aanvoer
  return_entity: sensor.warmtepomp_retour
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
  collector:
    mode: delta
    delta: 5
  fireplace:
    mode: temp
    temp: 45
  heatpump:
    mode: temp
    temp: 30
  hotwater:
    mode: temp
    temp: 30
  floor:
    mode: temp
    temp: 25
  radiator:
    mode: temp
    temp: 30
```

## Notes

- `active` or `pump` has priority over thresholds.
- For hot water, `flow_entity > 0` also activates flow.
- `mode: delta` compares against boiler top temperature.