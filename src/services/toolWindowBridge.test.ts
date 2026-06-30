import { describe, expect, it } from 'vitest';
import { createWebFallbackToolWindowBridge } from './toolWindowBridge';

describe('web fallback tool window bridge', () => {
  it('opens a tool window with fallback bounds and focus', async () => {
    const bridge = createWebFallbackToolWindowBridge();

    const state = await bridge.openToolWindow({ tool_id: 'tool_maya_export' });

    expect(state).toEqual({
      tool_id: 'tool_maya_export',
      is_open: true,
      is_focused: true,
      always_on_top: false,
      bounds: {
        x: 96,
        y: 96,
        width: 560,
        height: 720,
      },
    });
  });

  it('stores bounds and always-on-top intent for future desktop shell handoff', async () => {
    const bridge = createWebFallbackToolWindowBridge();

    await bridge.openToolWindow({
      tool_id: 'tool_blender_export',
      always_on_top: true,
      initial_bounds: { x: 320, y: 180, width: 480 },
    });
    await bridge.setBounds('tool_blender_export', { height: 640 });
    const state = await bridge.getToolWindowState('tool_blender_export');

    expect(state?.always_on_top).toBe(true);
    expect(state?.bounds).toEqual({
      x: 320,
      y: 180,
      width: 480,
      height: 640,
    });
  });

  it('closes a tool window without forgetting its last bounds', async () => {
    const bridge = createWebFallbackToolWindowBridge();

    await bridge.openToolWindow({
      tool_id: 'tool_unreal_export',
      initial_bounds: { x: 512, y: 240 },
    });
    await bridge.closeToolWindow('tool_unreal_export');
    const state = await bridge.getToolWindowState('tool_unreal_export');

    expect(state?.is_open).toBe(false);
    expect(state?.is_focused).toBe(false);
    expect(state?.bounds.x).toBe(512);
    expect(state?.bounds.y).toBe(240);
  });
});
