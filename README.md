# Boiler Heat Flow Card

Custom Home Assistant card voor boiler, zonnecollector, openhaard, warmtepomp, tapwater, vloerverwarming en radiatoren.

## Nieuw in v5.6

- aparte aanvoer- en retourlijnen voor de warmtepomp
- optionele tapwater flow sensor
- strakkere pipes met bolletjes-animatie
- fullscreen hoogte verbeterd
- nieuwe config editor met Home Assistant entity pickers

## HACS

Resource:

`/hacsfiles/boiler-heat-flow-card/boiler-heat-flow-card.js`

## Voorbeeld

```yaml
type: custom:boiler-heat-flow-card
title: Warmtesysteem
fullscreen: true
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
```
