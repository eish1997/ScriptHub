import { describe, expect, it } from 'vitest';
import { getMayaConnectorRepairSuggestion } from './mayaConnectorRepair';

describe('getMayaConnectorRepairSuggestion', () => {
  it('maps path errors to a path revision action', () => {
    const suggestion = getMayaConnectorRepairSuggestion('invalid_output_path');

    expect(suggestion.recommendedAction).toBe('revise_output_path');
    expect(suggestion.recoveryAction).toBe('revise_path');
    expect(suggestion.requiresUserInput).toBe(false);
  });

  it('maps Maya Python environment errors to user-guided repair', () => {
    const suggestion = getMayaConnectorRepairSuggestion('maya_python_unavailable');

    expect(suggestion.recommendedAction).toBe('switch_to_mayapy');
    expect(suggestion.recoveryAction).toBe('review');
    expect(suggestion.hermesActions.join(' ')).toContain('mayapy.exe');
  });

  it('keeps unknown errors recoverable through inspection', () => {
    const suggestion = getMayaConnectorRepairSuggestion('new_maya_error');

    expect(suggestion.canRetry).toBe(true);
    expect(suggestion.recommendedAction).toBe('inspect_connector_error');
    expect(suggestion.recoveryAction).toBe('review');
  });
});
