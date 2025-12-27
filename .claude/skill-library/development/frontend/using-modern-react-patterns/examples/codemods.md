# React Modernization - Codemods

Complete reference for automated React migration codemods.

## Quick Start

```bash
# Install jscodeshift globally
npm install -g jscodeshift

# React 19 all-in-one migration (recommended)
npx codemod react/19/migration-recipe

# TypeScript type fixes for React 19
npx types-react-codemod preset-19
```

## React 19 Codemods

### Migration Recipe (All-in-One)

Runs all React 19 breaking change codemods:

```bash
npx codemod react/19/migration-recipe
```

This applies:

- replace-reactdom-render
- replace-string-refs
- remove-proptypes
- replace-default-props
- remove-forwardref

### Individual React 19 Codemods

#### Replace ReactDOM.render

Migrates from ReactDOM.render to createRoot:

```bash
npx codemod react/19/replace-reactdom-render
```

**Before:**

```javascript
import ReactDOM from "react-dom";
ReactDOM.render(<App />, document.getElementById("root"));
```

**After:**

```javascript
import { createRoot } from "react-dom/client";
const root = createRoot(document.getElementById("root"));
root.render(<App />);
```

#### Replace String Refs

Converts string refs to callback refs or useRef:

```bash
npx codemod react/19/replace-string-refs
```

**Before:**

```javascript
<input ref="inputRef" />
```

**After:**

```javascript
const inputRef = useRef(null);
<input ref={inputRef} />;
```

#### Remove propTypes

Removes propTypes from function components:

```bash
npx codemod react/19/remove-proptypes
```

**Before:**

```javascript
function Button({ onClick }) {
  return <button onClick={onClick}>Click</button>;
}

Button.propTypes = {
  onClick: PropTypes.func.isRequired,
};
```

**After:**

```javascript
function Button({ onClick }) {
  return <button onClick={onClick}>Click</button>;
}
```

#### Replace defaultProps

Converts defaultProps to ES6 default parameters:

```bash
npx codemod react/19/replace-default-props
```

**Before:**

```javascript
function Button({ variant }) {
  return <button className={variant}>Click</button>;
}

Button.defaultProps = {
  variant: "primary",
};
```

**After:**

```javascript
function Button({ variant = "primary" }) {
  return <button className={variant}>Click</button>;
}
```

#### Remove forwardRef

Converts forwardRef to ref as regular prop:

```bash
npx codemod react/19/remove-forwardref
```

**Before:**

```javascript
import { forwardRef } from "react";

const Input = forwardRef((props, ref) => {
  return <input ref={ref} {...props} />;
});
```

**After:**

```javascript
function Input({ ref, ...props }) {
  return <input ref={ref} {...props} />;
}
```

## React 17/18 Codemods

### Rename Unsafe Lifecycle Methods

Renames UNSAFE\_ lifecycle methods:

```bash
npx react-codeshift --parser=tsx \
  --transform=react-codeshift/transforms/rename-unsafe-lifecycles.js \
  src/
```

**Before:**

```javascript
componentWillMount() { }
componentWillReceiveProps() { }
componentWillUpdate() { }
```

**After:**

```javascript
UNSAFE_componentWillMount() { }
UNSAFE_componentWillReceiveProps() { }
UNSAFE_componentWillUpdate() { }
```

### New JSX Transform

Updates code to use new JSX transform (React 17+):

```bash
npx react-codeshift --parser=tsx \
  --transform=react-codeshift/transforms/new-jsx-transform.js \
  src/
```

Removes unnecessary `import React from 'react'` when only JSX is used.

### Class to Hooks (Third-Party)

Converts class components to functional components with hooks:

```bash
npx codemod react/hooks/convert-class-to-function src/
```

**Note:** This is a third-party codemod and may require manual cleanup.

## TypeScript Codemods

### React 19 Type Fixes

Updates TypeScript types for React 19 compatibility:

```bash
npx types-react-codemod preset-19
```

Updates:

- ref prop types
- children prop types
- forwardRef types
- React.FC types
- Event handler types

## Advanced Usage

### Running Codemods with Options

```bash
# Specify parser
npx codemod --parser=tsx react/19/migration-recipe

# Dry run (preview changes)
npx codemod --dry react/19/migration-recipe

# Specific paths
npx codemod react/19/migration-recipe src/components/**/*.tsx

# With custom extensions
npx codemod --extensions=ts,tsx react/19/migration-recipe
```

### Combining Multiple Codemods

```bash
# Run multiple codemods in sequence
npx codemod react/19/replace-reactdom-render && \
npx codemod react/19/remove-forwardref && \
npx types-react-codemod preset-19
```

## Custom Codemod Example

Create custom codemods for project-specific transformations:

```javascript
// custom-codemod.js
module.exports = function (file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // Find setState calls
  root
    .find(j.CallExpression, {
      callee: {
        type: "MemberExpression",
        property: { name: "setState" },
      },
    })
    .forEach((path) => {
      // Transform to useState
      // ... transformation logic
    });

  return root.toSource();
};
```

### Running Custom Codemods

```bash
# With jscodeshift
jscodeshift -t custom-codemod.js src/

# With options
jscodeshift -t custom-codemod.js --parser=tsx --extensions=ts,tsx src/
```

### Common Custom Codemod Patterns

#### Finding Function Components

```javascript
// Find function components
root.find(j.FunctionDeclaration, {
  params: [
    {
      type: "ObjectPattern", // Props destructuring
    },
  ],
});
```

#### Finding useState Hooks

```javascript
// Find useState declarations
root.find(j.VariableDeclarator, {
  init: {
    type: "CallExpression",
    callee: { name: "useState" },
  },
});
```

#### Finding JSX Elements

```javascript
// Find specific JSX elements
root.find(j.JSXElement, {
  openingElement: {
    name: { name: "Button" },
  },
});
```

## Codemod Best Practices

1. **Backup First**: Always commit or backup code before running codemods
2. **Run Tests**: Execute test suite after each codemod
3. **Review Changes**: Don't blindly accept all transformations
4. **Incremental**: Run one codemod at a time for easier debugging
5. **Version Control**: Commit each codemod separately for easy rollback

## Common Issues

### Issue: Codemod Doesn't Transform File

**Solution**: Check file extensions and parser:

```bash
npx codemod --parser=tsx --extensions=ts,tsx react/19/migration-recipe
```

### Issue: Syntax Errors After Codemod

**Solution**: Review generated code, may need manual fixes for complex patterns

### Issue: Type Errors After React 19 Migration

**Solution**: Run TypeScript codemod:

```bash
npx types-react-codemod preset-19
```

### Issue: forwardRef Still Present

**Solution**: Ensure you're on React 19 and run the specific codemod:

```bash
npx codemod react/19/remove-forwardref
```

## Verification After Codemods

```bash
# Check for remaining issues
npm run lint
npm run type-check
npm test

# Check for deprecated patterns
grep -r "ReactDOM.render" src/
grep -r "forwardRef" src/
grep -r "propTypes" src/
```
