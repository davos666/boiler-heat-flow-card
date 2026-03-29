
# Boiler Heat Flow Card v6.1.1

YAML-only release based on v6.1.

## Changes

- Based on the working v6.1 code path.
- Visual editor removed to keep the code editor stable.
- Thresholds now support **temp** or **delta** mode per source.
- Legacy flat threshold keys are still supported.

## New threshold format

```yaml
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

## Legacy format still works

```yaml
thresholds:
  collector_delta: 5
  fireplace_temp: 45
  heatpump_temp: 30
  hotwater_temp: 30
  floor_temp: 25
  radiator_temp: 30
```
