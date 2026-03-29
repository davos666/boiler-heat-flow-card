# Boiler Heat Flow Card

v5.8

## Nieuw
- `center_no_grid`, `card_height`, `card_width`
- kleinere standaard layout
- werkende config editor met gewone dropdowns
- aparte aanvoer/retour warmtepomp
- optionele tapwater flow sensor

## Voorbeeld
```yaml
type: custom:boiler-heat-flow-card
title: Warmtesysteem
center_no_grid: false
card_height: 90%
card_width: 90%
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
  flow_entity: sensor.tapwater_flow
  flow_unit: l/min
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
  collector_delta: 5
  fireplace_temp: 45
  heatpump_temp: 30
  hotwater_temp: 30
  floor_temp: 25
  radiator_temp: 30
```
