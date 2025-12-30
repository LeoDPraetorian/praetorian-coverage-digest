# Common Mistakes

## Fat Interfaces

❌ 10-method interfaces forcing unnecessary implementation.

✅ Split into composed small interfaces.

## Interface in Wrong Package

❌ Define interface in implementation package.

✅ Define interface where consumed (consumer-side).

## Directories for Organization

❌ Creating `helpers/`, `utils/` that aren't real packages.

✅ Use files in existing package if not a real boundary.

## One File Per Struct

❌ Creating `config.go`, `config_test.go` for tiny structs.

✅ One file per capability unless >300 lines.

## Exported Everything

❌ Making all types exported "just in case."

✅ Start with internal/, export only what's needed.
