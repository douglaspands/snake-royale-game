/**
 * Viewport-Exact Drawing Surface tests (REQ-REND-005).
 * Boots the app entry point headlessly against the canvas mock (REQ-HARN-004)
 * with a stubbed layout viewport. No timers, no sleeps: the resize handler is
 * driven by dispatching a synthetic event on the mock window.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { MockCanvasElement, MockAnimationClock } from './harness/canvas_mock';
import { Camera } from '../src/render/camera';

const cameraInstances = vi.hoisted(() => [] as any[]);

// Records every Camera the app constructs so the initial (pre-resize) viewport
// passed by the constructor stays observable.
vi.mock('../src/render/camera', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/render/camera')>();
  class RecordingCamera extends actual.Camera {
    constructor(width?: number, height?: number, dpr?: number) {
      super(width, height, dpr);
      cameraInstances.push(this);
    }
  }
  return { ...actual, Camera: RecordingCamera };
});

interface ViewportStub {
  /** Layout viewport, i.e. document.documentElement.client{Width,Height}. */
  layoutWidth: number;
  layoutHeight: number;
  /** Host page scale: the visual viewport is the layout viewport divided by it. */
  pageScale: number;
  dpr: number;
}

class MockElement {
  public id: string = '';
  public className: string = '';
  public innerHTML: string = '';
  public style: Record<string, string> = {};
  public children: MockElement[] = [];
  public classList = {
    _classes: new Set<string>(),
    add: (c: string) => this.classList._classes.add(c),
    remove: (c: string) => this.classList._classes.delete(c),
    contains: (c: string) => this.classList._classes.has(c),
  };

  addEventListener(): void {}

  appendChild(child: MockElement): MockElement {
    this.children.push(child);
    return child;
  }
}

interface BootedApp {
  canvas: MockCanvasElement;
  camera: Camera;
  window: any;
  fireResize: () => void;
}

async function bootApp(stub: ViewportStub): Promise<BootedApp> {
  const listeners: Record<string, Array<(e: any) => void>> = {};
  const canvas = Object.assign(new MockCanvasElement(), { addEventListener: () => {} });
  const clock = new MockAnimationClock();

  const mockWindow = {
    // Visual viewport: shrinks/grows with the host page scale.
    innerWidth: stub.layoutWidth / stub.pageScale,
    innerHeight: stub.layoutHeight / stub.pageScale,
    devicePixelRatio: stub.dpr,
    location: { protocol: 'http:', host: 'localhost:8000' },
    addEventListener: (evt: string, cb: (e: any) => void) => {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(cb);
    },
    dispatchEvent: (evt: any) => {
      for (const cb of listeners[evt.type] || []) cb(evt);
      return true;
    },
  };

  const mockDocument = {
    // Layout viewport: invariant under page scale.
    documentElement: { clientWidth: stub.layoutWidth, clientHeight: stub.layoutHeight },
    body: new MockElement(),
    getElementById: (id: string) => (id === 'game-canvas' ? canvas : null),
    createElement: () => new MockElement(),
    querySelectorAll: () => [] as any[],
  };

  (globalThis as any).window = mockWindow;
  (globalThis as any).document = mockDocument;
  (globalThis as any).requestAnimationFrame = (cb: (t: number) => void) =>
    clock.requestAnimationFrame(cb);

  cameraInstances.length = 0;
  vi.resetModules();
  await import('../src/main');
  mockWindow.dispatchEvent({ type: 'DOMContentLoaded' });

  return {
    canvas,
    camera: cameraInstances[0],
    window: mockWindow,
    fireResize: () => mockWindow.dispatchEvent({ type: 'resize' }),
  };
}

describe('Viewport-Exact Drawing Surface (REQ-REND-005)', () => {
  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).document;
    delete (globalThis as any).requestAnimationFrame;
  });

  describe('Scenario: drawing surface matches the layout viewport', () => {
    it('should size the canvas to the layout viewport on boot and on resize', async () => {
      const app = await bootApp({ layoutWidth: 412, layoutHeight: 883, pageScale: 1.0, dpr: 2.0 });

      expect(app.canvas.style.width).toBe('412px');
      expect(app.canvas.style.height).toBe('883px');
      // Backing store keeps the devicePixelRatio scaling untouched.
      expect(app.canvas.width).toBe(824);
      expect(app.canvas.height).toBe(1766);
      expect(app.camera.viewportWidth).toBe(412);
      expect(app.camera.viewportHeight).toBe(883);

      // Orientation flip: the new layout viewport is adopted verbatim.
      (globalThis as any).document.documentElement.clientWidth = 883;
      (globalThis as any).document.documentElement.clientHeight = 412;
      app.fireResize();

      expect(app.canvas.style.width).toBe('883px');
      expect(app.canvas.style.height).toBe('412px');
      expect(app.camera.viewportWidth).toBe(883);
      expect(app.camera.viewportHeight).toBe(412);
    });

    it('should never exceed the layout viewport, so the document cannot overflow', async () => {
      const app = await bootApp({ layoutWidth: 360, layoutHeight: 740, pageScale: 1.0, dpr: 1.0 });
      const docEl = (globalThis as any).document.documentElement;

      expect(parseFloat(app.canvas.style.width)).toBeLessThanOrEqual(docEl.clientWidth);
      expect(parseFloat(app.canvas.style.height)).toBeLessThanOrEqual(docEl.clientHeight);
    });

    it('should size #app from the layout viewport box instead of 100vw/100vh', async () => {
      // Read through a dynamic specifier: the client tsconfig ships no node types.
      const fsSpecifier = 'node:fs';
      const fs: any = await import(/* @vite-ignore */ fsSpecifier);
      const css: string = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf-8');
      const appRule = /#app\s*\{([^}]*)\}/.exec(css);

      expect(appRule).not.toBeNull();
      expect(appRule![1]).toMatch(/width:\s*100%/);
      expect(appRule![1]).toMatch(/height:\s*100%/);
      // Viewport units include the scrollbar gutter and can round into overflow.
      expect(css).not.toMatch(/:\s*100vw/);
      expect(css).not.toMatch(/:\s*100vh/);
    });
  });

  describe('Scenario: page scale does not feed back into surface sizing', () => {
    it('should compute identical dimensions at page scale 1.0 and 0.5', async () => {
      const unscaled = await bootApp({
        layoutWidth: 412,
        layoutHeight: 883,
        pageScale: 1.0,
        dpr: 2.0,
      });
      const baseline = {
        cssWidth: unscaled.canvas.style.width,
        cssHeight: unscaled.canvas.style.height,
        backingWidth: unscaled.canvas.width,
        backingHeight: unscaled.canvas.height,
        cameraWidth: unscaled.camera.viewportWidth,
        cameraHeight: unscaled.camera.viewportHeight,
      };

      // Same layout viewport, host shrunk the page to 50% -> window.inner* halves.
      const scaled = await bootApp({
        layoutWidth: 412,
        layoutHeight: 883,
        pageScale: 0.5,
        dpr: 2.0,
      });
      expect(scaled.window.innerWidth).not.toBe(412);

      expect({
        cssWidth: scaled.canvas.style.width,
        cssHeight: scaled.canvas.style.height,
        backingWidth: scaled.canvas.width,
        backingHeight: scaled.canvas.height,
        cameraWidth: scaled.camera.viewportWidth,
        cameraHeight: scaled.camera.viewportHeight,
      }).toEqual(baseline);
    });

    it('should keep the surface fixed when only the page scale changes', async () => {
      const app = await bootApp({ layoutWidth: 412, layoutHeight: 883, pageScale: 1.0, dpr: 1.0 });
      const before = { w: app.canvas.style.width, h: app.canvas.style.height };

      // A shrink-to-fit zoom-out only moves the visual viewport.
      app.window.innerWidth = 549;
      app.window.innerHeight = 1177;
      app.fireResize();

      expect({ w: app.canvas.style.width, h: app.canvas.style.height }).toEqual(before);
      expect(app.camera.viewportWidth).toBe(412);
      expect(app.camera.viewportHeight).toBe(883);
    });
  });
});
