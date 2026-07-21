# Architecture

TastyList is intentionally a static, browser-only application.

## Ownership

- `app.js` owns browser events and rendering.
- `storage.js` owns schema validation, profile identity, browser persistence, backup, and import/export.
- `catalog.js` owns the stable food catalog.
- `preference.js` owns preference cycling and overall/preparation resolution.
- `compare.js` owns comparison classification, including preparation overrides.
- `dish.js` owns ingredient matching.
- `share.js` owns versioned share-code encoding.

## Persistence model

The current schema stores one versioned state document:

```text
{
  schemaVersion,
  activeProfileId,
  profiles: {
    "<stable profile id>": {
      id,
      name,
      kind,
      createdAt,
      updatedAt,
      items: {
        "<food key>": {
          tolerance,
          rating,
          preparationPreferences,
          notes
        }
      }
    }
  }
}
```

Names are display values, not keys. This allows profile renames and duplicate human names without data loss.

## Profile kinds

- `local` — created in the current browser
- `guest` — imported from a file or share code

Both kinds remain local. The distinction helps users understand which profiles originated elsewhere.

## Comparison model

A comparison accepts two or three profiles. Foods are grouped into conflicts, shared likes, shared dislikes, and mixed or incomplete results.

## Future server path

The storage module is the migration seam for a future account-backed service. A server implementation can replace browser persistence while keeping the profile and comparison contracts stable.
