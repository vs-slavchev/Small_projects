/*
 * Scenarios are inputs only: what clients ask for and what happens to the
 * machines. How the cache reacts is up to each version, which is what makes
 * the same scenario comparable across versions.
 *
 * Ops run in order. By default an op waits until no messages are in flight.
 * `after: ms` starts it that many ms after the previous op instead, even if
 * messages are still in flight (after: 0 means "at the same moment").
 */
(function () {
  const LAB = (globalThis.LAB = globalThis.LAB || { versions: [], scenarios: [] });

  LAB.scenarios.push(
    {
      id: 'put-get',
      title: 'Write, then read',
      lesson: 'The happy path. One write, then one read of the same key.',
      watch: 'Which node stores the key? How many messages does one request cost?',
      ops: [
        { do: 'put', key: 'user:42', value: 'Ada' },
        { do: 'get', key: 'user:42' },
      ],
    },
    {
      id: 'overwrite',
      title: 'Overwrite a key',
      lesson: 'Two writes to the same key, then a read.',
      watch: 'Where does the second write go? Is the old value kept anywhere?',
      ops: [
        { do: 'put', key: 'cart:7', value: '1 book' },
        { do: 'put', key: 'cart:7', value: '2 books' },
        { do: 'get', key: 'cart:7' },
      ],
    },
    {
      id: 'crash',
      title: 'A node crashes',
      lesson: 'Three keys are written. Node A crashes and the client reads all three. A restarts and the client reads them again.',
      watch: 'Which reads fail while A is down? What does A remember after it restarts?',
      ops: [
        { do: 'put', key: 'user:1', value: 'Ann' },
        { do: 'put', key: 'user:2', value: 'Ben', after: 0 },
        { do: 'put', key: 'user:3', value: 'Cy', after: 0 },
        { do: 'crash', node: 'A' },
        { do: 'get', key: 'user:1' },
        { do: 'get', key: 'user:2', after: 0 },
        { do: 'get', key: 'user:3', after: 0 },
        { do: 'restart', node: 'A' },
        { do: 'get', key: 'user:1' },
        { do: 'get', key: 'user:2', after: 0 },
        { do: 'get', key: 'user:3', after: 0 },
      ],
    },
    {
      id: 'add-node',
      title: 'Add a node',
      lesson: 'Four keys are written. Node D joins the cluster, then the client reads all four keys.',
      watch: 'Which keys can still be found after D joins? What happens to the copies already stored?',
      ops: [
        { do: 'put', key: 'item:1', value: 'lamp' },
        { do: 'put', key: 'item:3', value: 'desk', after: 0 },
        { do: 'put', key: 'item:4', value: 'chair', after: 0 },
        { do: 'put', key: 'item:5', value: 'rug', after: 0 },
        { do: 'addNode', node: 'D' },
        { do: 'get', key: 'item:1' },
        { do: 'get', key: 'item:3', after: 0 },
        { do: 'get', key: 'item:4', after: 0 },
        { do: 'get', key: 'item:5', after: 0 },
      ],
    }
  );
})();
