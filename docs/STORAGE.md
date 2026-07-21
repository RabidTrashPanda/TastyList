# Browser storage and recovery

TastyList uses `localStorage` because the data set is small, must survive browser restarts, and benefits from zero infrastructure.

## Guarantees

- State is written after every profile change.
- The state schema is versioned.
- Malformed stored JSON is copied to a timestamped recovery key before the active key is reset.
- Full backups use a versioned `tastylist-backup` envelope and include every profile and the selected profile.
- Individual exports contain one profile.
- Imported profiles receive a new stable ID to avoid overwriting an existing profile.
- Backup restore rejects unrelated JSON and unsupported backup versions before replacing browser data.

## Limits

Browser storage is scoped to the current browser profile and site origin. It does not synchronize between devices. Private browsing, site-data clearing, or browser cleanup can remove the data.

Use **Export backup** before clearing browser data or moving to another device.
