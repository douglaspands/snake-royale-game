import { describe, it, expect } from 'vitest';
import { MockCanvasElement, MockAnimationClock } from './harness/canvas_mock';
import { TouchSimulator } from './harness/touch_simulator';
import { PacketGenerator } from './harness/packet_generator';

describe('Frontend Test Harness Verification', () => {
  it('should correctly mock canvas 2d drawing calls and dimensions', () => {
    const canvas = new MockCanvasElement();
    const ctx = canvas.getContext('2d');
    expect(ctx).toBeDefined();

    ctx.fillRect(10, 20, 100, 200);
    ctx.arc(50, 50, 25, 0, Math.PI * 2);
    ctx.stroke();

    expect(ctx.countCalls('fillRect')).toBe(1);
    expect(ctx.countCalls('arc')).toBe(1);
    expect(ctx.countCalls('stroke')).toBe(1);
    expect(ctx.drawCalls[0]).toEqual({ method: 'fillRect', args: [10, 20, 100, 200] });
  });

  it('should step animation frames deterministically', () => {
    const clock = new MockAnimationClock();
    let frame1Executed = false;
    let frame2Executed = false;

    clock.requestAnimationFrame((time) => {
      frame1Executed = true;
      expect(time).toBe(16.666);
    });

    clock.step(16.666);
    expect(frame1Executed).toBe(true);

    clock.requestAnimationFrame(() => {
      frame2Executed = true;
    });
    clock.step(16.666);
    expect(frame2Executed).toBe(true);
  });

  it('should simulate touch events and virtual joystick dragging', () => {
    const events: any[] = [];
    const target = {
      dispatchEvent: (evt: any) => {
        events.push(evt);
        return true;
      },
    } as unknown as EventTarget;

    const simulator = new TouchSimulator(target);
    simulator.simulateJoystickDrag(100, 100, 150, 100, 2);

    expect(events.length).toBe(3); // 1 pointerdown + 2 pointermove
    expect(events[0].type).toBe('pointerdown');
    expect(events[0].clientX).toBe(100);
    expect(events[2].type).toBe('pointermove');
    expect(events[2].clientX).toBe(150);
  });

  it('should generate valid moving snapshot streams for interpolator tests', () => {
    const stream = PacketGenerator.generateMovingStream(100, 100, 180, 0, 10, 33.33);
    expect(stream.length).toBe(10);
    expect(stream[0].snakes[0].head.x).toBeGreaterThan(100);
    expect(stream[9].snakes[0].head.x).toBeGreaterThan(stream[0].snakes[0].head.x);
    expect(stream[0].type).toBe('WORLD_SNAPSHOT');
  });
});
