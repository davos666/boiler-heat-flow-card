# Boiler Heat Flow Card

Een Home Assistant custom card voor warmtestromen tussen zonnecollector, boiler, openhaard, warmtepomp, vloerverwarming en radiatoren.

## HACS

Gebruik als custom repository van het type **Dashboard**.

Resource:

`/hacsfiles/boiler-heat-flow-card/boiler-heat-flow-card.js`

## Features in v5.4

- Strakke Sunsynk-achtige layout
- Dunne leidingen in plaats van brede vlakken
- Bewegende bolletjes als flow-animatie
- Schermvullende hoogte
- Klikbare config editor met dropdowns voor entities
- Boiler in strakke cilinder-vorm

## Voorbeeldconfig

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
