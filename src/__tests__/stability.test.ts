import AsyncStorage from '@react-native-async-storage/async-storage';

import { logError, readErrors } from '@/errors';
import { sanitize } from '@/prefs';

describe('saved preferences', () => {
  it.each([null, 'x', 42, [], { onboarded: 'yes', persona: 'pirate', checklist: 'registry' }])('corrupt data %p falls back to defaults', (raw) => {
    expect(sanitize(raw)).toEqual({ onboarded: false, persona: null, checklist: [] });
  });

  it('keeps valid fields and drops bad checklist items', () => {
    expect(sanitize({ onboarded: true, persona: 'worker', checklist: ['registry', 3, null, 'owner'] })).toEqual({
      onboarded: true,
      persona: 'worker',
      checklist: ['registry', 'owner'],
    });
  });
});

describe('local error log', () => {
  beforeEach(() => AsyncStorage.clear());

  it('records newest first and survives non-Error values', async () => {
    logError('render', new TypeError('boom'));
    logError('fatal', 'plain string');
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    const log = await readErrors();
    // Messages keep the stack after the first line, for support.
    expect(log.map((e) => [e.where, e.message.split('\n')[0]])).toEqual([
      ['fatal', 'plain string'],
      ['render', 'TypeError: boom'],
    ]);
  });

  it('reads a corrupt log as empty instead of throwing', async () => {
    await AsyncStorage.setItem('kovil.errors', '{not json');
    await expect(readErrors()).resolves.toEqual([]);
  });
});

describe('fatal error storm', () => {
  it('trips after 3 fatal errors within 10 s, not for spread-out ones', () => {
    const { recordFatal } = jest.requireActual<typeof import('@/errors')>('@/errors');
    expect([recordFatal(0), recordFatal(20_000), recordFatal(40_000)]).toEqual([false, false, false]);
    expect([recordFatal(100_000), recordFatal(101_000), recordFatal(102_000)]).toEqual([false, false, true]);
  });

  it('logs objects whose toString throws without throwing itself', () => {
    const evil = { toString: () => { throw new Error('nope'); } };
    expect(() => logError('fatal', evil)).not.toThrow();
  });
});
