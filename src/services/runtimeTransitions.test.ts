import { describe, expect, it, vi } from 'vitest';
import {
  approval,
  asset,
  capabilities,
  connector,
  disconnectConnector,
  resetRuntime,
  session,
  task,
} from './mockRuntime';
import {
  applyApprovalDecisionState,
  applyCapabilitiesRefreshErrorState,
  applyCapabilitiesRefreshState,
  applyConnectorHealthRefreshState,
  applyConnectorState,
  completeRunState,
  recoverTaskState,
  resetRuntimeState,
  simulateFailureState,
} from './runtimeTransitions';

describe('runtimeTransitions', () => {
  it('moves an approved task into running state', () => {
    vi.setSystemTime(new Date('2026-05-20T08:00:00.000Z'));
    const nextApproval = { ...approval, status: 'approved' as const };

    const result = applyApprovalDecisionState({
      decision: 'approved',
      nextApproval,
      session,
      task,
    });

    expect(result.approval.status).toBe('approved');
    expect(result.task.status).toBe('running');
    expect(result.task.approval_status).toBe('approved');
    expect(result.session.status).toBe('active');
    expect(result.runtimeError).toBeUndefined();
  });

  it('moves a rejected task into canceled state', () => {
    const nextApproval = { ...approval, status: 'rejected' as const };

    const result = applyApprovalDecisionState({
      decision: 'rejected',
      nextApproval,
      session,
      task,
    });

    expect(result.approval.status).toBe('rejected');
    expect(result.task.status).toBe('canceled');
    expect(result.task.approval_status).toBe('rejected');
    expect(result.toast).toContain('已拒绝');
  });

  it('records connector disconnect state and toast', () => {
    const nextConnector = disconnectConnector(connector);

    const result = applyConnectorState({
      connected: false,
      nextConnector,
      session,
    });

    expect(result.connector.status).toBe('disconnected');
    expect(result.connector.health.state).toBe('unavailable');
    expect(result.session.status).toBe('active');
    expect(result.toast).toContain('已断开');
  });

  it('records connector health refresh state and toast', () => {
    const nextConnector = {
      ...connector,
      health: {
        ...connector.health,
        latency_ms: 36,
      },
    };

    const result = applyConnectorHealthRefreshState({
      nextConnector,
      session,
    });

    expect(result.connector.health.latency_ms).toBe(36);
    expect(result.session.status).toBe('active');
    expect(result.toast).toBe('Connector 健康状态已刷新');
  });

  it('records completed run state', () => {
    const runningTask = { ...task, status: 'running' as const };

    const result = completeRunState({
      currentAsset: asset,
      session,
      task: runningTask,
    });

    expect(result.task.status).toBe('succeeded');
    expect(result.currentAsset.status).toBe('created');
    expect(result.recoveryEvent).toContain('Asset 已记录');
    expect(result.runtimeError).toBeUndefined();
  });

  it('creates a recoverable failure state for empty selection', () => {
    const result = simulateFailureState({
      kind: 'empty_selection',
      session,
      task,
    });

    expect(result.task.status).toBe('failed');
    expect(result.runtimeError.type).toBe('validation_error');
    expect(result.runtimeError.requires_human_review).toBe(true);
    expect(result.recoveryEvent).toBe('');
  });

  it('retries a failed task back into running state', () => {
    const failedTask = { ...task, status: 'failed' as const };

    const result = recoverTaskState({
      action: 'retry',
      session,
      task: failedTask,
    });

    expect(result.task.status).toBe('running');
    expect(result.runtimeError).toBeUndefined();
    expect(result.recoveryEvent).toContain('重试');
  });

  it('revises output path and returns task to planned state', () => {
    const failedTask = { ...task, status: 'failed' as const };

    const result = recoverTaskState({
      action: 'revise_path',
      session,
      task: failedTask,
    });

    expect(result.task.status).toBe('planned');
    expect(result.task.metadata.output_path).toContain('_v002.fbx');
    expect(result.toast).toContain('输出路径已修改');
  });

  it('records capability refresh state for returned capabilities', () => {
    const result = applyCapabilitiesRefreshState(capabilities);

    expect(result.capabilities.length).toBeGreaterThan(0);
    expect(result.capabilityError).toBe('');
    expect(result.toast).toContain('已从 Runtime 刷新');
  });

  it('records capability refresh state for empty capabilities', () => {
    const result = applyCapabilitiesRefreshState([]);

    expect(result.capabilities).toEqual([]);
    expect(result.capabilityError).toBe('');
    expect(result.toast).toContain('未返回任何能力');
  });

  it('records capability refresh error state', () => {
    const result = applyCapabilitiesRefreshErrorState(new Error('Hermes unavailable'));

    expect(result.capabilityError).toBe('Hermes unavailable');
    expect(result.toast).toContain('能力列表刷新失败');
  });

  it('resets runtime state to initial session objects', () => {
    const initial = resetRuntime();

    const result = resetRuntimeState(initial);

    expect(result.session.id).toBe(initial.session.id);
    expect(result.task.id).toBe(initial.task.id);
    expect(result.approval.id).toBe(initial.approval.id);
    expect(result.connector.id).toBe(initial.connector.id);
    expect(result.recoveryEvent).toBe('');
    expect(result.runtimeError).toBeUndefined();
  });
});
