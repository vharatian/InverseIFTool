# AGENTS.md - Agent Guidelines for CoreUI React Admin Template

## Build, Lint & Test Commands

- **Build**: `npm run build` (or `vite build`)
- **Dev server**: `npm start` (or `vite`)
- **Lint**: `npm run lint` (or `eslint`)
- **Preview**: `npm run serve` (or `vite preview`)

## Code Style Guidelines

### Formatting

- **Prettier**: No semicolons, single quotes, trailing commas everywhere, 100 char width, 2 space tabs
- **EditorConfig**: 2 space indentation, LF line endings, trim trailing whitespace

### ESLint Rules

- React recommended rules + React hooks rules enabled
- Prettier integration for consistent formatting
- Ignores `eslint.config.mjs`

### Naming Conventions

- **Components**: PascalCase (e.g., `Dashboard`, `AppHeader`)
- **Files**: PascalCase for components, camelCase for utilities
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE

### Import Organization

```javascript
// React imports first
import React, { useState } from 'react'

// Third-party libraries (alphabetical)
import { HashRouter, Route } from 'react-router-dom'
import { useSelector } from 'react-redux'

// CoreUI imports (grouped)
import { CButton, CCard } from '@coreui/react'
import CIcon from '@coreui/icons-react'

// Local imports (relative paths)
import WidgetsDropdown from '../widgets/WidgetsDropdown'
import './scss/style.scss'
```

### React Patterns

- Functional components with arrow functions
- React hooks for state management
- Proper dependency arrays in useEffect
- Lazy loading for route components
- JSX fragment shorthand (`<>`)

### Error Handling

- Use try/catch for async operations
- ESLint disable comments for intentional hook dependency skips

### File Structure

- `src/components/` - Reusable UI components
- `src/views/` - Page components
- `src/assets/` - Static assets (images, icons)
- `src/scss/` - Stylesheets</content>
  <parameter name="filePath">/home/farhoud/workspace/turing/AGENTS.md
