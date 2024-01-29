import { removeEmptyKeys } from './Constraints';

describe('removeEmptyKeys', () => {
  it('should remove empty keys from objects', () => {
    const input = {
      key1: 'value1',
      key2: '',
      key3: {
        key31: 'value31',
        key32: '',
      },
      key4: ['value41', ''],
    };

    const expectedOutput = {
      key1: 'value1',
      key3: {
        key31: 'value31',
      },
      key4: ['value41', ''],
    };

    expect(removeEmptyKeys(input)).toEqual(expectedOutput);
  });

  it('should not remove empty keys from top-level single-key objects', () => {
    const input = {
      key1: '',
    };

    const expectedOutput = {
      key1: '',
    };

    expect(removeEmptyKeys(input)).toEqual(expectedOutput);
  });

  it('should remove empty keys from nested single-key objects', () => {
    const input = {
      key1: {
        key11: '',
      },
    };

    const expectedOutput = {
      key1: {},
    };

    expect(removeEmptyKeys(input)).toEqual(expectedOutput);
  });
});