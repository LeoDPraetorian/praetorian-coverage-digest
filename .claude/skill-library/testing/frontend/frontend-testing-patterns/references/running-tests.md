# Running Tests

## Commands

```bash
# Run all tests in watch mode
npm test

# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage

# Run with UI dashboard
npm run test:ui

# Run specific test file
npm test -- path/to/file.test.tsx

# Run tests matching pattern
npm test -- --grep "preseed"
```

## Coverage Requirements

- **Configuration**: 100% coverage for config files
- **Hooks**: 80%+ coverage for custom hooks
- **Components**: Focus on integration tests
- **Utilities**: Comprehensive unit tests with edge cases

## Watch Mode Tips

- Press `a` to run all tests
- Press `f` to run only failed tests
- Press `p` to filter by filename
- Press `t` to filter by test name
- Press `q` to quit

## Coverage Analysis

```bash
# Generate coverage report
npm run test:coverage

# Open HTML coverage report
open coverage/index.html
```

## CI/CD Integration

```bash
# Run tests in CI (no watch, with coverage)
npm run test:run -- --coverage --reporter=verbose
```

## Related

- [Main Skill](../SKILL.md)
- [Troubleshooting](troubleshooting.md)
