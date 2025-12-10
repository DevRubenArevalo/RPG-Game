# Running Tests

This project uses [Jest](https://jestjs.io/) for unit testing.

## Prerequisites

You need Node.js and npm installed. If you don't have them:

**Windows:**
```bash
# Download and install from https://nodejs.org/
# Or use winget:
winget install OpenJS.NodeJS
```

**WSL/Linux:**
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## Installation

Install dependencies:
```bash
npm install
```

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

Tests are located in the `__tests__/` directory:

- `utils.test.js` - Tests for pure utility functions (clamp, randomRange, overlap, etc.)
- `gameStateManager.test.js` - Tests for GameStateManager state transitions and events

## Writing Tests

Example test structure:

```javascript
import { describe, it, expect } from '@jest/globals';
import { myFunction } from '../resources/js/myFile.js';

describe('myFunction', () => {
  it('should do something specific', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

## Coverage Reports

After running `npm run test:coverage`, open `coverage/index.html` in your browser to see detailed coverage reports.

## Current Coverage

- ✅ Utils functions (clamp, randomRange, overlap, snapshot, collision detection)
- ✅ GameStateManager (all state transition methods)
- 🚧 TODO: Player, Enemy, Renderer, Controllers (coming soon)
