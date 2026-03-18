/**
 * Performance benchmarks for Weave reactive library
 * Run with: npm run bench
 */

import { bench, describe } from 'vitest';
import { createReactiveEffect, runEffect, track, trigger } from '../src/core/dependency-tracker';
import { batch } from '../src/reactive/batch';
import { computed } from '../src/reactive/computed';
import { ref } from '../src/reactive/ref';

describe('Reactive System Performance', () => {
  bench('ref creation', () => {
    ref(0);
  });

  bench('ref read', () => {
    const r = ref(0);
    r.value;
  });

  bench('ref write', () => {
    const r = ref(0);
    r.value = 1;
  });

  bench('ref write with effect', () => {
    const r = ref(0);
    let dummy: number;
    const effect = createReactiveEffect(() => {
      dummy = r.value;
    });
    runEffect(effect);
    r.value = 1;
  });

  bench('computed creation', () => {
    const r = ref(0);
    computed(() => r.value * 2);
  });

  bench('computed read (cached)', () => {
    const r = ref(0);
    const c = computed(() => r.value * 2);
    c.value;
    c.value;
    c.value;
  });

  bench('computed read (dirty)', () => {
    const r = ref(0);
    const c = computed(() => r.value * 2);
    c.value;
    r.value = 1;
    c.value;
  });

  bench('batch 10 updates', () => {
    const r = ref(0);
    batch(() => {
      for (let i = 0; i < 10; i++) {
        r.value = i;
      }
    });
  });

  bench('batch 100 updates', () => {
    const r = ref(0);
    batch(() => {
      for (let i = 0; i < 100; i++) {
        r.value = i;
      }
    });
  });

  bench('track/trigger cycle', () => {
    const target = {};
    const effect = createReactiveEffect(() => {
      track(target, 'key');
    });
    runEffect(effect);
    trigger(target, 'key');
  });

  bench('10 refs with 1 computed', () => {
    const refs = Array.from({ length: 10 }, (_, i) => ref(i));
    const c = computed(() => refs.reduce((sum, r) => sum + r.value, 0));
    c.value;
  });

  bench('100 refs with 1 computed', () => {
    const refs = Array.from({ length: 100 }, (_, i) => ref(i));
    const c = computed(() => refs.reduce((sum, r) => sum + r.value, 0));
    c.value;
  });

  bench('chain of 10 computed', () => {
    const r = ref(0);
    let c = computed(() => r.value);
    for (let i = 0; i < 9; i++) {
      const prev = c;
      c = computed(() => prev.value + 1);
    }
    c.value;
  });

  bench('update with 10 dependent effects', () => {
    const r = ref(0);
    const effects = Array.from({ length: 10 }, () => {
      let dummy: number;
      return createReactiveEffect(() => {
        dummy = r.value;
      });
    });
    effects.forEach(e => runEffect(e));
    r.value = 1;
  });

  bench('update with 100 dependent effects', () => {
    const r = ref(0);
    const effects = Array.from({ length: 100 }, () => {
      let dummy: number;
      return createReactiveEffect(() => {
        dummy = r.value;
      });
    });
    effects.forEach(e => runEffect(e));
    r.value = 1;
  });
});

describe('Dependency Tracking Performance', () => {
  bench('track 100 properties', () => {
    const target = {};
    const effect = createReactiveEffect(() => {
      for (let i = 0; i < 100; i++) {
        track(target, `key${i}`);
      }
    });
    runEffect(effect);
  });

  bench('trigger 100 properties', () => {
    const target = {};
    const effect = createReactiveEffect(() => {
      for (let i = 0; i < 100; i++) {
        track(target, `key${i}`);
      }
    });
    runEffect(effect);
    
    for (let i = 0; i < 100; i++) {
      trigger(target, `key${i}`);
    }
  });

  bench('track same property 100 times', () => {
    const target = {};
    const effect = createReactiveEffect(() => {
      for (let i = 0; i < 100; i++) {
        track(target, 'key');
      }
    });
    runEffect(effect);
  });
});

describe('Batch Performance', () => {
  bench('nested batch (depth 10)', () => {
    const r = ref(0);
    let depth = 10;
    
    function nestedBatch(d: number): void {
      if (d === 0) {
        r.value++;
        return;
      }
      batch(() => nestedBatch(d - 1));
    }
    
    nestedBatch(depth);
  });

  bench('parallel updates in batch', () => {
    const refs = Array.from({ length: 100 }, (_, i) => ref(i));
    batch(() => {
      refs.forEach((r, i) => {
        r.value = i * 2;
      });
    });
  });
});
