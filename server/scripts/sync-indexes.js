// Deploy-time index sync: makes each collection's indexes match its Mongoose schema.
// Builds missing indexes and drops ones the schema no longer declares.
//   npm run db:indexes            (dev,  .env.local)
//   npm run db:indexes:prod       (prod, .env.prod)
//   add `-- --dry-run` to only print what would change
import { pathToFileURL } from "url";

/** MongoDB's default index name for a key, e.g. { user: 1, createdAt: -1 } → "user_1_createdAt_-1". */
const defaultName = (key) => Object.entries(key).map(([field, dir]) => `${field}_${dir}`).join("_");

/**
 * Existing indexes that duplicate a declared index under a different name.
 * MongoDB refuses to create an index whose key already exists under another name, and
 * syncIndexes does not handle that, so these must be dropped before syncing.
 * @param {{ name: string, key: object }[]} existing Indexes on the collection.
 * @param {[object, object][]} declared `schema.indexes()`: [key, options] pairs.
 * @returns {string[]} Names of the existing indexes to drop.
 */
export function legacyNamed(existing, declared) {
  return existing
    .filter((ix) => ix.name !== "_id_")
    .filter((ix) =>
      declared.some(
        ([key, options = {}]) =>
          JSON.stringify(key) === JSON.stringify(ix.key) &&
          (options.name ?? defaultName(key)) !== ix.name,
      ),
    )
    .map((ix) => ix.name);
}

/**
 * Syncs (or, with dryRun, diffs) the indexes of each model. One model failing does not stop the rest.
 * @param {import("mongoose").Model[]} models Models to process.
 * @param {{ dryRun?: boolean }} [options]
 * @returns {Promise<object[]>} Per model: `{ model, dropped }`; for a dry run `{ model, toDrop, toCreate, renamed }`;
 *   on failure `{ model, error }`.
 */
export async function run(models, { dryRun = false } = {}) {
  const report = [];
  for (const Model of models) {
    try {
      const renamed = legacyNamed(await Model.collection.indexes(), Model.schema.indexes());
      if (dryRun) {
        const { toDrop, toCreate } = await Model.diffIndexes();
        report.push({ model: Model.modelName, toDrop, toCreate, renamed });
        continue;
      }
      for (const name of renamed) await Model.collection.dropIndex(name);
      // syncIndexes returns the names of the indexes it dropped
      const dropped = await Model.syncIndexes();
      report.push({ model: Model.modelName, dropped: [...renamed, ...dropped] });
    } catch (err) {
      report.push({ model: Model.modelName, error: err.message });
    }
  }
  return report;
}

/** CLI entry: connects with MONGO_URI, syncs every model, prints a report, exits non-zero on failure. */
async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const { default: mongoose } = await import("mongoose");
  const models = await import("../models/import.js");
  try {
    await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });
    const report = await run(Object.values(models), { dryRun });
    console.log(`${dryRun ? "Dry run — nothing changed" : "Indexes synced"}:`);
    for (const r of report) console.log(" ", JSON.stringify(r));
    if (report.some((r) => r.error)) process.exitCode = 1;
  } catch (err) {
    console.error("Index sync failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
