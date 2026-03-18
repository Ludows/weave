/**
 * Tests for watch(), when(), unless(), and memo()
 */

import { describe, expect, it } from 'vitest';
import { ref } from './ref';
import { memo, unless, watch, when } from './watch';

describe('watch()', () => {
  it('should execute handler when dependency changes', () => {
    const count = ref(0);
    const values: number[] = [];
    
    watch(
      () => count.value,
      (newVal, oldVal) => {
        values.push(newVal as number);
      }
    );
    
    count.value = 1;
    count.value = 2;
    count.value = 3;
    
    expect(values).toEqual([1, 2, 3]);
  });

  it('should pass newValue and oldValue to handler', () => {
    const count = ref(0);
    let newValue: number | undefined;
    let oldValue: number | undefined;
    
    watch(
      () => count.value,
      (newVal, oldVal) => {
        newValue = newVal as number;
        oldValue = oldVal as number;
      }
    );
    
    count.value = 5;
    
    expect(newValue).toBe(5);
    expect(oldValue).toBe(0);
  });

  it('should return unwatch function', () => {
    const count = ref(0);
    const values: number[] = [];
    
    const unwatch = watch(
      () => count.value,
      (newVal) => {
        values.push(newVal as number);
      }
    );
    
    count.value = 1;
    unwatch();
    count.value = 2;
    
    // Should only capture first change
    expect(values).toEqual([1]);
  });

  it('should support array of watch sources', () => {
    const count = ref(0);
    const name = ref('test');
    const changes: any[] = [];
    
    watch(
      [() => count.value, () => name.value],
      (newVals, oldVals) => {
        changes.push({ new: newVals, old: oldVals });
      }
    );
    
    count.value = 1;
    name.value = 'updated';
    
    expect(changes.length).toBe(2);
    expect(changes[0].new).toEqual([1, 'test']);
    expect(changes[1].new).toEqual([1, 'updated']);
  });

  it('should support deep watching', () => {
    const obj = ref({ nested: { value: 1 } });
    const values: number[] = [];
    
    watch(
      () => obj.value,
      {
        then: (newVal: any) => {
          values.push(newVal.nested.value);
        },
        deep: true
      }
    );
    
    obj.value = { nested: { value: 2 } };
    
    expect(values).toEqual([2]);
  });

  it('should support debouncing', async () => {
    const count = ref(0);
    const values: number[] = [];
    
    watch(
      () => count.value,
      {
        then: (newVal) => {
          values.push(newVal as number);
        },
        debounce: 50
      }
    );
    
    count.value = 1;
    count.value = 2;
    count.value = 3;
    
    // Should not execute immediately
    expect(values).toEqual([]);
    
    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Should only execute once with latest value
    expect(values).toEqual([3]);
  });
});

describe('when()', () => {
  it('should execute function when condition is true', () => {
    const count = ref(0);
    const executions: number[] = [];
    
    when(
      () => count.value > 0,
      () => {
        executions.push(count.value);
      }
    );
    
    count.value = 1;
    count.value = 2;
    
    expect(executions.length).toBeGreaterThan(0);
  });

  it('should not execute when condition is false', () => {
    const count = ref(0);
    let executed = false;
    
    when(
      () => count.value > 10,
      () => {
        executed = true;
      }
    );
    
    count.value = 5;
    
    expect(executed).toBe(false);
  });

  it('should re-evaluate when dependencies change', () => {
    const count = ref(0);
    const executions: number[] = [];
    
    when(
      () => count.value > 2,
      () => {
        executions.push(count.value);
      }
    );
    
    count.value = 1; // condition false
    count.value = 3; // condition true
    count.value = 4; // condition true
    
    expect(executions.length).toBeGreaterThan(0);
  });
});

describe('unless()', () => {
  it('should execute function when condition is false', () => {
    const count = ref(0);
    let executed = false;
    
    unless(
      () => count.value > 10,
      () => {
        executed = true;
      }
    );
    
    expect(executed).toBe(true);
  });

  it('should not execute when condition is true', () => {
    const count = ref(10);
    const executions: number[] = [];
    
    unless(
      () => count.value > 5,
      () => {
        executions.push(count.value);
      }
    );
    
    count.value = 15;
    
    // Should not execute since condition is true
    expect(executions.length).toBe(0);
  });

  it('should re-evaluate when dependencies change', () => {
    const count = ref(10);
    const executions: number[] = [];
    
    unless(
      () => count.value > 5,
      () => {
        executions.push(count.value);
      }
    );
    
    count.value = 3; // condition false, should execute
    
    expect(executions.length).toBeGreaterThan(0);
  });
});

describe('memo()', () => {
  it('should return memoized version of function', () => {
    const count = ref(0);
    let computeCount = 0;
    
    const memoized = memo(() => {
      computeCount++;
      return count.value * 2;
    });
    
    const result1 = memoized();
    const result2 = memoized();
    
    expect(result1).toBe(0);
    expect(result2).toBe(0);
    expect(computeCount).toBe(1); // Should only compute once
  });

  it('should recalculate when dependencies change', () => {
    const count = ref(0);
    let computeCount = 0;
    
    const memoized = memo(() => {
      computeCount++;
      return count.value * 2;
    });
    
    const result1 = memoized();
    count.value = 5;
    const result2 = memoized();
    
    expect(result1).toBe(0);
    expect(result2).toBe(10);
    expect(computeCount).toBe(2); // Should compute twice
  });

  it('should cache result until dependencies change', () => {
    const count = ref(0);
    let computeCount = 0;
    
    const memoized = memo(() => {
      computeCount++;
      return count.value * 2;
    });
    
    memoized();
    memoized();
    memoized();
    
    expect(computeCount).toBe(1);
    
    count.value = 1;
    
    memoized();
    memoized();
    
    expect(computeCount).toBe(2);
  });
});
