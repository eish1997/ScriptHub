export type ToolWindowBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ToolFloatingWindowRequest = {
  tool_id: string;
  initial_bounds?: Partial<ToolWindowBounds>;
  always_on_top?: boolean;
  focus?: boolean;
};

export type ToolWindowState = {
  tool_id: string;
  is_open: boolean;
  is_focused: boolean;
  always_on_top: boolean;
  bounds: ToolWindowBounds;
};

export type ToolWindowBridge = {
  openToolWindow(request: ToolFloatingWindowRequest): Promise<ToolWindowState>;
  closeToolWindow(tool_id: string): Promise<void>;
  focusToolWindow(tool_id: string): Promise<void>;
  setAlwaysOnTop(tool_id: string, value: boolean): Promise<ToolWindowState>;
  setBounds(tool_id: string, bounds: Partial<ToolWindowBounds>): Promise<ToolWindowState>;
  getToolWindowState(tool_id: string): Promise<ToolWindowState | undefined>;
};

const defaultBounds: ToolWindowBounds = {
  x: 96,
  y: 96,
  width: 560,
  height: 720,
};

export function createWebFallbackToolWindowBridge(): ToolWindowBridge {
  const states = new Map<string, ToolWindowState>();

  function getStateOrDefault(toolId: string): ToolWindowState {
    return states.get(toolId) ?? {
      tool_id: toolId,
      is_open: false,
      is_focused: false,
      always_on_top: false,
      bounds: defaultBounds,
    };
  }

  return {
    async openToolWindow(request) {
      const current = getStateOrDefault(request.tool_id);
      const next: ToolWindowState = {
        ...current,
        is_open: true,
        is_focused: request.focus ?? true,
        always_on_top: request.always_on_top ?? current.always_on_top,
        bounds: {
          ...current.bounds,
          ...request.initial_bounds,
        },
      };
      states.set(request.tool_id, next);
      return next;
    },

    async closeToolWindow(toolId) {
      const current = getStateOrDefault(toolId);
      states.set(toolId, {
        ...current,
        is_open: false,
        is_focused: false,
      });
    },

    async focusToolWindow(toolId) {
      const current = getStateOrDefault(toolId);
      states.set(toolId, {
        ...current,
        is_open: true,
        is_focused: true,
      });
    },

    async setAlwaysOnTop(toolId, value) {
      const current = getStateOrDefault(toolId);
      const next = {
        ...current,
        always_on_top: value,
      };
      states.set(toolId, next);
      return next;
    },

    async setBounds(toolId, bounds) {
      const current = getStateOrDefault(toolId);
      const next = {
        ...current,
        bounds: {
          ...current.bounds,
          ...bounds,
        },
      };
      states.set(toolId, next);
      return next;
    },

    async getToolWindowState(toolId) {
      return states.get(toolId);
    },
  };
}

export const toolWindowBridge = createWebFallbackToolWindowBridge();
