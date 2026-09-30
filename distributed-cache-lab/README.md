# Cache Lab

A distributed cache built one idea at a time, to learn the core trade-offs by watching them happen.

Every version runs the same planned scenarios in a simulated network. You step through a run one
event at a time (a request sent, a message arriving, a node crashing) and see every node's memory,
every message in flight, and whether each read returned the right answer.

**Open `index.html` in a browser.** No build, no server, no dependencies.
Tests: `node --test` in this folder.

## How to use it
1. Pick a version and a scenario.
2. Read its NOTES.md and **predict** what will happen.
3. Press **Next event** (or `→`) and check your prediction.
4. The **Overview** page compares every version on every scenario.

## The model
- Every message takes exactly **10 ms**. Clients give up after **50 ms** without a reply.
- A crashed node loses its memory (it's a cache). Messages sent to a down node are dropped.
- There is no randomness, so a run always plays out the same way.
- Every finished request is judged against what the client was told earlier:

| Label | Meaning |
|---|---|
| `acked` / `hit` | Write confirmed / read returned the latest acknowledged value |
| `miss` | Key was never written. Normal |
| `unavailable` | No reply in time |
| `value lost` | Read found nothing, but a write for this key was acknowledged earlier |
| `stale read` | Read returned an older value than one already acknowledged |

For a cache, `value lost` is allowed (the data comes back from the database) but costs a
database hit. `stale read` is the one that silently shows users wrong data.

## Layout
```
index.html            overview + comparison table + stepper
shared/sim.js         simulation harness: clock, message queue, crashes, outcome judging
shared/scenarios.js   the scenarios (inputs only: client ops, crashes, joins)
shared/view.js        drawing: node cards, messages in flight, event log
v1-single-node/       cache.js (the behaviour) + NOTES.md (idea, predictions, results)
v2-modulo-sharding/   copy of v1 plus one change
test/                 node:test checks for determinism and expected outcomes
```
The harness knows nothing about caching; all cache behaviour lives in each version's `cache.js`.
Each version is a **plain copy** of an earlier one plus one change, so every version reads on
its own. Duplication is intentional.

**To add a version:** copy the previous folder, change one idea, add its `<script>` tag to
`index.html`, and mark it in the ladder there.

## Versions
| | Version | The one new idea | Status |
|---|---|---|---|
| v1 | Single node | One node holds everything | built |
| v2 | Modulo sharding | `hash(key) % N` over 3 nodes, client-side routing | built |
| v3 | Consistent hashing | Hash ring + virtual nodes | planned |
| v4 | Async primary–backup | A backup copy sent after the reply | planned |
| v5 | Sync replication | Reply only once the backup has it | planned |
| v6 | Heartbeats and failover | Detect failures, promote backups | planned |
| v7 | Versions and conflicts | Last-write-wins vs compare-and-set | planned |
| v8 | Leaderless quorums | N/R/W, branching from v3 | planned |
| v9 | Read repair, hinted handoff | Replicas heal themselves | planned |
| v10 | Cache-aside with a database | Stale-set race, stampede | planned |
| v11 | Near cache + invalidation | Local copies kept fresh | planned |

The order can change as we go.

---

## The design space (reference)

Every distributed cache answers these questions. Each version above picks one more answer.

**A cache may lose data.** It is not the source of truth. That permission is what makes caches
simpler than databases. Keep asking: *what happens if this entry just disappears?*

**Where does it live?** Separate servers (Memcached, Redis), embedded in each app (Hazelcast),
or a small local cache in front of a remote one (near cache).

**Who holds which key?** Everyone holds everything (replicated), or keys are split (partitioned).
Ways to split: `hash % N` (v2), consistent hashing with virtual nodes, rendezvous hashing, or fixed
slots plus a slot table (Redis Cluster uses 16,384 slots).

**How does a request find its node?** The client computes it (v2), any node forwards it, or a
proxy routes it.

**How many copies?** None; primary–backup (sync or async); leaderless quorums where W + R > N;
chain replication.

**What can a reader see?** Linearizable (behaves like one copy), read-your-writes, or eventual.
When copies disagree: last-write-wins by timestamp (clocks drift), versions with compare-and-set,
vector clocks, or CRDTs. During a network split you choose between staying available and staying
consistent (CAP). Otherwise you choose between latency and consistency (PACELC).

**Who is in the cluster?** Static config, heartbeats, gossip (SWIM), or a coordinator
(Raft, ZooKeeper, etcd). The dangerous case is split brain: both halves think the other is dead.

**What happens when a node joins or leaves?** Accept the misses, migrate data, hinted handoff,
read repair, anti-entropy with Merkle trees.

**What happens when memory is full?** Eviction: LRU, LFU, CLOCK, sampled random (Redis),
W-TinyLFU (Caffeine). Expiry: checked on read, a background sweep, or both.

**How does it relate to the database?** Cache-aside, read-through, write-through, write-behind,
refresh-ahead. Classic failures: cache stampede on a hot key's expiry, hot keys overloading one
node, and a stale value written back into the cache after an invalidation.

**Out of scope here:** wire protocols, serialization, threading and real performance. The lab
simulates the network so the focus stays on behaviour, not plumbing.
