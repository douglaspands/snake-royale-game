# Physics Delta Specification: v1.2.0-MICRO-SNAKE

## 1. Modified Constants
```diff
- BASE_SEGMENT_COUNT = 10
- MIN_BOOST_MASS = 15.0
- INITIAL_MASS = 10.0
+ BASE_SEGMENT_COUNT = 3
+ MIN_BOOST_MASS = 3.0
+ INITIAL_MASS = 3.0
```

## 2. Dynamic Segment Count Formula
```diff
- target_segment_count = BASE_SEGMENT_COUNT + int(mass * 1.5)
+ target_segment_count = BASE_SEGMENT_COUNT + int(max(0.0, mass - MIN_BOOST_MASS) * 1.5)
```

## 3. Turbo Mass Drain & 1:1 Pellet Conservation
```diff
- if boost and mass >= MIN_BOOST_MASS:
-     mass = max(MIN_BOOST_MASS - 0.1, mass - mass_lost)
+ if boost and mass > MIN_BOOST_MASS:
+     mass = max(MIN_BOOST_MASS, mass - mass_lost)
+     if mass <= MIN_BOOST_MASS:
+         boost = False
+     mass_drop_accumulator += actual_mass_lost
+     while mass_drop_accumulator >= 1.0:
+         mass_drop_accumulator -= 1.0
+         emit_boost_pellet(tail_pos, val=1.0)
```
- **Conservation of Mass:** Total dropped boost pellets have exact 1:1 value matching the mass lost by the boosting snake ($\sum \text{pellet.val} = \Delta M_{\text{lost}}$).
