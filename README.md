# Boiler Heat Flow Card

Thermische Home Assistant card voor:

- zonnecollector
- boiler
- openhaard
- warmtepomp
- tapwater
- vloerverwarming
- radiatoren

## HACS

Voeg deze repo toe als **Dashboard** repository in HACS.

Resource:

```text
/hacsfiles/boiler-heat-flow-card/boiler-heat-flow-card.js
```

## Nieuw in v5.2

- strakkere boiler SVG
- geanimeerde flow-deeltjes op de leidingen
- warmtepomp aanvoer + retour
- aparte aanvoer- en retourlijnen in de layout
- `ha-form` config editor met klikbare entity selectors
- root-bestand voor nette HACS updates

## Voorbeeld

```yaml
type: custom:boiler-heat-flow-card
title: Warmtesysteem
animations: true
show_legend: true
show_return_temps: true

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
  flow: sensor.tapwater_debiet
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
  supply: sensor.warmtepomp_aanvoer_temp
  return: sensor.warmtepomp_retour_temp
  label: Warmtepomp
  icon: mdi:heat-pump

floor:
  entity: sensor.vloerverwarming_temp
  active: binary_sensor.vloerverwarming_actief
  flow: sensor.vloerverwarming_flow
  label: Vloerverwarming
  icon: mdi:heating-coil

radiator:
  entity: sensor.radiator_temp
  active: binary_sensor.radiator_actief
  flow: sensor.radiator_flow
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


## Updates via Home Assistant

Als de kaart via HACS is geïnstalleerd en je op GitHub een nieuwe release/tag publiceert, verschijnt de update ook onder **Instellingen > Updates** en kun je die daar installeren.


## v5.2

- Strakkere Sunsynk-achtige styling
- Boiler-artefacts rond het vat verminderd
- Minder agressieve glow en blur op leidingen
- Scherpere nodes en rustiger achtergrond
