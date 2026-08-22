# Installation

> This page covers the npm package for CLI and programmatic use. No terminal? [Install the VS Code extension](./vscode.md) instead.

## Requirements

- Node.js >= 18.0.0
- bun (or yarn/pnpm)

## Package Installation

### bun

```bash
bun add wiremd
```

### yarn

```bash
yarn add wiremd
```

### pnpm

```bash
pnpm add wiremd
```

## Global CLI Installation

To use the `wiremd` command globally:

```bash
bun add -g wiremd
```

Verify installation:

```bash
wiremd --version
```

## Development Installation

To contribute to wiremd or run from source:

```bash
# Clone the repository
git clone https://github.com/teezeit/wiremd.git
cd wiremd

# Install dependencies
bun install

# Build the project
bun run build

# Run tests
bun run test

# Link globally for development
bun link
```

## Verify Installation

### Using the CLI

```bash
# Create a test file
echo "## Test\n[Button]" > test.md

# Render it
wiremd test.md

# Should create test.html
```

### Using the API

Create a test script `test.js`:

```javascript
import { parse, renderToHTML } from 'wiremd';

const ast = parse('## Test\n[Button]');
const html = renderToHTML(ast);
console.log('Success! wiremd is installed.');
```

Run it:

```bash
node test.js
```

## TypeScript Support

wiremd is written in TypeScript and includes type definitions. No additional `@types` package is needed.

```typescript
import type { DocumentNode, WiremdNode } from 'wiremd';
```

## Troubleshooting

### Module not found

If you see "Cannot find module 'wiremd'":

1. Ensure you're in the correct directory
2. Run `bun install` again
3. Check that `node_modules/wiremd` exists

### Command not found after global install

Bun installs global binaries to `~/.bun/bin`, which is user-writable — no `sudo` is ever needed. If the `wiremd` command isn't found, make sure that directory is on your `PATH`:

```bash
echo 'export PATH=~/.bun/bin:$PATH' >> ~/.zshrc   # or ~/.bashrc
```

### Node version issues

Check your Node version:

```bash
node --version
```

If it's less than 18.0.0, upgrade Node.js.

## Next Steps

- [Full install options](./installation.md)
- [Browse Components](../components/)
- [Explore Examples](../examples/)
