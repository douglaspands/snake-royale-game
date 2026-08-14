# Physics Delta Specification: v1.3.0-COMBAT-POLISH

## 1. Pure Contact & Elimination of Self-Collision
```diff
  # 5. Check Head-to-Body Collisions
- for seg_ref in nearby_segments:
-     if seg_ref.snake_id == snake.id and seg_ref.segment_idx <= 6:
-         continue
+ for seg_ref in nearby_segments:
+     # Strict rule: snakes NEVER collide with their own body segments
+     if seg_ref.snake_id == snake.id:
+         continue
```

## 2. Strict Hitbox Precision
- Distance condition: $d < (R_{\text{head}} + R_{\text{body}}) - 2.0\text{px}$ ensuring visible physical overlap prior to death event dispatch.
