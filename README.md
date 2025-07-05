# Editor Whiteboard React Component

A modular, type-safe, mobile-friendly whiteboard React component with draggable, resizable, and rotatable areas, live-editable sidepanel, and prompt-based generation.

## Install

```
npm install @your-org/editor-whiteboard react react-dom react-moveable
```

## Usage

```tsx
import React from 'react';
import { Editor, EditorImplementation, ObjectLocation, ObjectDataPair } from '@your-org/editor-whiteboard';

const editorImpl: EditorImplementation = {
  getObjectLocations: () => [...],
  generateFromPrompt: async (prompt) => ({ component: ... , width: 375, height: 667 }),
  setObjectLocation: (index, newLocation) => { ... },
  getObjectData: (id) => [...],
  setObjectData: (id, data) => { ... },
};

export default function App() {
  return <Editor editorImpl={editorImpl} />;
}
```

## API

### `<Editor editorImpl={...} />`

- `editorImpl: EditorImplementation` (**required**):
  - `getObjectLocations(): ObjectLocation[]` — Return all area locations.
  - `generateFromPrompt(prompt: string): Promise<{ component: React.FC, width: number, height: number }>` — Generate board from prompt.
  - `setObjectLocation(index: number, newLocation: ObjectLocation): void` — Update area location.
  - `getObjectData(id: string): ObjectDataPair[]` — Get key/value data for area.
  - `setObjectData(id: string, data: ObjectDataPair[]): void` — Set key/value data for area.

### Types

- `ObjectLocation`: `{ id: string, top: number, left: number, width: number, height: number, zIndex: number, rotation: number }`
- `ObjectDataPair`: `{ key: string, value: string }`
- `EditorImplementation`: see above

## Peer Dependencies

- `react` >= 18
- `react-dom` >= 18
- `react-moveable` >= 0.56

---

MIT License
