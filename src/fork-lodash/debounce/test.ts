import assert from "node:assert";
import debounce from ".";

describe("debounce", () => {
  it("should debounce a function", (done) => {
    let callCount = 0;

    const debounced = debounce((value) => {
      ++callCount;
      return value;
    }, 32);

    const results = [debounced("a"), debounced("b"), debounced("c")];
    assert.deepStrictEqual(results, [undefined, undefined, undefined]);
    assert.strictEqual(callCount, 0);

    setTimeout(() => {
      assert.strictEqual(callCount, 1);

      const results = [debounced("d"), debounced("e"), debounced("f")];
      assert.deepStrictEqual(results, ["c", "c", "c"]);
      assert.strictEqual(callCount, 1);
    }, 128);

    setTimeout(() => {
      assert.strictEqual(callCount, 2);
      done();
    }, 256);
  });

  it("subsequent debounced calls return the last `func` result", (done) => {
    const debounced = debounce((value) => value, 32);
    debounced("a");

    setTimeout(() => {
      assert.notStrictEqual(debounced("b"), "b");
    }, 64);

    setTimeout(() => {
      assert.notStrictEqual(debounced("c"), "c");
      done();
    }, 128);
  });

  it("should not immediately call `func` when `wait` is `0`", (done) => {
    let callCount = 0;
    const debounced = debounce(() => {
      ++callCount;
    }, 0);

    debounced();
    debounced();
    assert.strictEqual(callCount, 0);

    setTimeout(() => {
      assert.strictEqual(callCount, 1);
      done();
    }, 5);
  });

  it("should apply default options", (done) => {
    let callCount = 0;
    const debounced = debounce(
      () => {
        callCount++;
      },
      32,
      {}
    );

    debounced();
    assert.strictEqual(callCount, 0);

    setTimeout(() => {
      assert.strictEqual(callCount, 1);
      done();
    }, 64);
  });

  it("should support a `leading` option", (done) => {
    const callCounts = [0, 0];

    const withLeading = debounce(
      () => {
        callCounts[0]++;
      },
      32,
      { lead: true }
    );

    const withLeadingAndTrailing = debounce(
      () => {
        callCounts[1]++;
      },
      32,
      { lead: true }
    );

    withLeading();
    assert.strictEqual(callCounts[0], 1);

    withLeadingAndTrailing();
    withLeadingAndTrailing();
    assert.strictEqual(callCounts[1], 1);

    setTimeout(() => {
      assert.deepStrictEqual(callCounts, [1, 2]);

      withLeading();
      assert.strictEqual(callCounts[0], 2);

      done();
    }, 64);
  });

  it("subsequent leading debounced calls return the last `func` result", (done) => {
    const debounced = debounce((value) => value, 32, {
        lead: true,
        trail: false,
      }),
      results = [debounced("a"), debounced("b")];

    assert.deepStrictEqual(results, ["a", "a"]);

    setTimeout(() => {
      const results = [debounced("c"), debounced("d")];
      assert.deepStrictEqual(results, ["c", "c"]);
      done();
    }, 64);
  });

  it("should support a `trailing` option", (done) => {
    let withCount = 0,
      withoutCount = 0;

    const withTrailing = debounce(
      () => {
        withCount++;
      },
      32,
      { trail: true }
    );

    const withoutTrailing = debounce(
      () => {
        withoutCount++;
      },
      32,
      { trail: false }
    );

    withTrailing();
    assert.strictEqual(withCount, 0);

    withoutTrailing();
    assert.strictEqual(withoutCount, 0);

    setTimeout(() => {
      assert.strictEqual(withCount, 1);
      assert.strictEqual(withoutCount, 0);
      done();
    }, 64);
  });

  it("should support a `maxWait` option", (done) => {
    let callCount = 0;

    const debounced = debounce(
      () => {
        ++callCount;
      },
      32,
      { delayLimit: 64 }
    );

    debounced();
    debounced();
    assert.strictEqual(callCount, 0);

    setTimeout(() => {
      assert.strictEqual(callCount, 1);
      debounced();
      debounced();
      assert.strictEqual(callCount, 1);
    }, 128);

    setTimeout(() => {
      assert.strictEqual(callCount, 2);
      done();
    }, 256);
  });

  it("should support `maxWait` in a tight loop", (done) => {
    const limit = 320;
    let withCount = 0;
    let withoutCount = 0;

    const withMaxWait = debounce(
      () => {
        withCount++;
      },
      64,
      { delayLimit: 128 }
    );

    const withoutMaxWait = debounce(() => {
      withoutCount++;
    }, 96);

    const start = Date.now();
    while (Date.now() - start < limit) {
      withMaxWait();
      withoutMaxWait();
    }
    setTimeout(() => {
      const actual = [Boolean(withoutCount), Boolean(withCount)];
      assert.deepStrictEqual(actual, [false, true]);
      done();
    }, 1);
  });

  it("should queue a trail call for subsequent debounced calls after `maxWait`", (done) => {
    let callCount = 0;

    const debounced = debounce(
      () => {
        ++callCount;
      },
      200,
      { delayLimit: 200 }
    );

    debounced();

    setTimeout(debounced, 190);
    setTimeout(debounced, 200);
    setTimeout(debounced, 210);

    setTimeout(() => {
      assert.strictEqual(callCount, 2);
      done();
    }, 500);
  });

  it("should cancel `maxDelayed` when `delayed` is invoked", (done) => {
    let callCount = 0;

    const debounced = debounce(
      () => {
        callCount++;
      },
      32,
      { delayLimit: 64 }
    );

    debounced();

    setTimeout(() => {
      debounced();
      assert.strictEqual(callCount, 1);
    }, 128);

    setTimeout(() => {
      assert.strictEqual(callCount, 2);
      done();
    }, 192);
  });

  it("should invoke the trailing call with the correct arguments and `this` binding", (done) => {
    let actual: [object, Array<any>],
      callCount = 0;
    const object = {};
    const params = ["a"];
    const debounced = debounce(
      function (this: object, ...args: any[]) {
        actual = [this, args];
        return ++callCount != 2;
      },
      32,
      { lead: true, delayLimit: 64 }
    );

    while (true) {
      if (!debounced.apply(object, params)) {
        break;
      }
    }
    setTimeout(() => {
      assert.strictEqual(callCount, 2);
      assert.deepStrictEqual(actual, [object, params]);
      done();
    }, 64);
  });
});
