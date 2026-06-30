import { describe, expect, it } from 'vitest';
import {
  getToolBridgeDescriptor,
  listHttpToolDescriptors,
  listMcpToolDescriptors,
  listToolBridgeDescriptors,
} from './toolBridgeDescriptors';

const requiredToolNames = [
  'scriptHub.connector.health.get',
  'scriptHub.task.create',
  'scriptHub.approval.decide',
  'scriptHub.asset.register',
  'scriptHub.skill.candidate.create',
  'scriptHub.skill.candidate.save_draft',
  'scriptHub.skill.candidate.submit_review',
  'scriptHub.skill.candidate.reject',
  'scriptHub.skill.candidate.publish',
];

describe('toolBridgeDescriptors', () => {
  it('registers the first Tool Bridge descriptor set from one source', () => {
    const descriptors = listToolBridgeDescriptors();

    expect(descriptors.map((descriptor) => descriptor.name)).toEqual(requiredToolNames);
    for (const descriptor of descriptors) {
      expect(descriptor.version).toBe('1.0.0');
      expect(descriptor.owner).toBe('ScriptHub');
      expect(descriptor.name).toMatch(/^scriptHub\.[a-z_]+(\.[a-z_]+)+$/);
      expect(descriptor.input_schema.type).toBe('object');
      expect(descriptor.output_schema.type).toBe('object');
      expect(descriptor.supported_transports).toEqual(['mcp', 'http', 'local_bridge']);
      expect(descriptor.permissions.length).toBeGreaterThan(0);
    }
  });

  it('keeps MCP tools/list and HTTP fallback discovery consistent', () => {
    const mcpTools = listMcpToolDescriptors();
    const httpTools = listHttpToolDescriptors();

    expect(mcpTools).toHaveLength(httpTools.length);
    for (const httpTool of httpTools) {
      const mcpTool = mcpTools.find((tool) => tool.name === httpTool.name);
      expect(mcpTool).toMatchObject({
        description: httpTool.description,
        inputSchema: httpTool.input_schema,
        name: httpTool.name,
        title: httpTool.title,
      });
    }
  });

  it('exposes approval and risk metadata for high-impact tools', () => {
    expect(getToolBridgeDescriptor('scriptHub.task.create')).toMatchObject({
      approval_required: true,
      risk_level: 'high',
    });
    expect(getToolBridgeDescriptor('scriptHub.approval.decide')).toMatchObject({
      approval_required: false,
      permissions: ['approval:decide'],
      risk_level: 'high',
    });
  });

  it('registers skill candidate creation as a low-risk provenance tool', () => {
    expect(getToolBridgeDescriptor('scriptHub.skill.candidate.create')).toMatchObject({
      approval_required: false,
      permissions: ['skill_candidate:create'],
      risk_level: 'low',
      tags: ['skill', 'tool-bridge', 'provenance'],
    });
  });

  it('registers skill candidate review flow tools with permissions and risk boundaries', () => {
    expect(getToolBridgeDescriptor('scriptHub.skill.candidate.save_draft')).toMatchObject({
      approval_required: false,
      permissions: ['skill_candidate:update'],
      risk_level: 'low',
    });
    expect(getToolBridgeDescriptor('scriptHub.skill.candidate.submit_review')).toMatchObject({
      approval_required: false,
      permissions: ['skill_candidate:submit_review'],
      risk_level: 'medium',
    });
    expect(getToolBridgeDescriptor('scriptHub.skill.candidate.reject')).toMatchObject({
      approval_required: false,
      permissions: ['skill_candidate:review'],
      risk_level: 'medium',
    });
    expect(getToolBridgeDescriptor('scriptHub.skill.candidate.publish')).toMatchObject({
      approval_required: true,
      permissions: ['skill_candidate:publish'],
      risk_level: 'high',
    });
  });
});
