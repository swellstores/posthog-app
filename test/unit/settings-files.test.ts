import { describe, expect, it } from 'vitest';
import { EVENT_DEFINITIONS } from '../../functions/lib/events';
import orders from '../../settings/orders.json';
import revenue from '../../settings/revenue.json';
import subscriptions from '../../settings/subscriptions.json';

interface SettingsField {
  id?: string;
  default?: unknown;
  fields?: SettingsField[];
}

const FILES: Record<string, { fields: SettingsField[] }> = {
  orders,
  revenue,
  subscriptions,
};

/** Toggles sit inside layout rows; layout fields have no id. */
function dataFields(fields: SettingsField[]): SettingsField[] {
  return fields.flatMap((field) => (field.fields ? dataFields(field.fields) : [field]));
}

describe('settings files', () => {
  it('declare a toggle with the registry default for every event', () => {
    for (const definition of EVENT_DEFINITIONS) {
      const field = dataFields(FILES[definition.settingsGroup]?.fields ?? []).find(
        (candidate) => candidate.id === `${definition.key}_enabled`,
      );
      expect(field, definition.key).toBeDefined();
      expect(field?.default, definition.key).toBe(definition.defaultEnabled);
    }
  });

  it('declare no toggle the registry does not know', () => {
    const known = new Set(EVENT_DEFINITIONS.map((definition) => `${definition.key}_enabled`));
    const declared = Object.values(FILES).flatMap((file) => dataFields(file.fields).map((field) => field.id));
    expect(declared.filter((id) => !known.has(id ?? ''))).toEqual([]);
  });
});
