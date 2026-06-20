import crypto from "node:crypto";

export function createReportStore({ retentionMs, now = Date.now }) {
  const records = new Map();

  function purgeExpired() {
    const cutoff = now() - retentionMs;
    for (const [id, record] of records.entries()) {
      if (record.createdAtMs < cutoff) records.delete(id);
    }
  }

  return {
    create(owner, report) {
      purgeExpired();
      const id = crypto.randomUUID();
      const record = {
        ...report,
        id,
        owner,
        createdAt: new Date(now()).toISOString(),
        createdAtMs: now()
      };
      records.set(id, record);
      return { ...record };
    },

    list(owner) {
      purgeExpired();
      return [...records.values()]
        .filter((record) => record.owner === owner)
        .map(({ createdAtMs, owner: _owner, ...record }) => record);
    },

    get(owner, id) {
      purgeExpired();
      const record = records.get(id);
      if (!record || record.owner !== owner) return null;
      const { createdAtMs, owner: _owner, ...safeRecord } = record;
      return safeRecord;
    },

    purgeExpired,
    size() {
      purgeExpired();
      return records.size;
    }
  };
}
