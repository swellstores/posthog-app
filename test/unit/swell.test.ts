import { describe, expect, it, vi } from 'vitest';
import { eventRecordId, fetchPerson, fetchRecord } from '../../functions/lib/swell';
import { createMockRequest } from '../helpers/mock-request';

describe('eventRecordId', () => {
  it('reads the record id from the event payload', () => {
    expect(eventRecordId(createMockRequest({ data: { id: 'ord_1' } }))).toBe('ord_1');
  });

  it('falls back to the id inside $event.data', () => {
    const req = createMockRequest({
      data: { $event: { id: 'evt_1', type: 'subscription.paid', model: 'subscriptions', data: { id: 'sub_1' } } },
    });
    expect(eventRecordId(req)).toBe('sub_1');
  });

  it('is undefined when the payload has no id', () => {
    expect(eventRecordId(createMockRequest({ data: {} }))).toBeUndefined();
  });
});

describe('fetchRecord', () => {
  it('loads a record by id', async () => {
    const get = vi.fn(async () => ({ id: 'ord_1' }));
    const req = createMockRequest({ swell: { get } });

    await expect(fetchRecord(req, '/orders', 'ord_1')).resolves.toEqual({ id: 'ord_1' });
    expect(get).toHaveBeenCalledWith('/orders/{id}', { id: 'ord_1' });
  });

  it('returns null when the record no longer exists', async () => {
    const get = vi.fn(async () => {
      throw new SwellError('Not found', { status: 404 });
    });
    await expect(fetchRecord(createMockRequest({ swell: { get } }), '/orders', 'gone')).resolves.toBeNull();

    const getNull = vi.fn(async () => null);
    await expect(fetchRecord(createMockRequest({ swell: { get: getNull } }), '/orders', 'gone')).resolves.toBeNull();
  });

  it('rethrows other errors so Swell retries', async () => {
    const get = vi.fn(async () => {
      throw new SwellError('Server error', { status: 500 });
    });
    await expect(fetchRecord(createMockRequest({ swell: { get } }), '/orders', 'ord_1')).rejects.toThrow(
      'Server error',
    );
  });
});

describe('fetchPerson', () => {
  it('returns the account email and name', async () => {
    const get = vi.fn(async () => ({ id: 'acc_1', email: 'ivan@example.com', name: 'Ivan Petrov' }));
    const req = createMockRequest({ swell: { get } });

    await expect(fetchPerson(req, 'acc_1')).resolves.toEqual({
      email: 'ivan@example.com',
      name: 'Ivan Petrov',
    });
    expect(get).toHaveBeenCalledWith('/accounts/{id}', { fields: 'email,name', id: 'acc_1' });
  });

  it('omits an empty name', async () => {
    const get = vi.fn(async () => ({ id: 'acc_1', email: 'ivan@example.com', name: null }));
    await expect(fetchPerson(createMockRequest({ swell: { get } }), 'acc_1')).resolves.toEqual({
      email: 'ivan@example.com',
    });
  });

  it('returns an empty person when the account was deleted', async () => {
    const get = vi.fn(async () => {
      throw new SwellError('Not found', { status: 404 });
    });
    await expect(fetchPerson(createMockRequest({ swell: { get } }), 'acc_1')).resolves.toEqual({});
  });
});
