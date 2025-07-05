import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Editor, ObjectLocation, ObjectDataPair } from './App';

let _objectData: Record<string, ObjectDataPair[]> = {};
let _currentLocations: ObjectLocation[] = [];

export const editorImpl = {
  getObjectLocations(): ObjectLocation[] {
    return _currentLocations;
  },
  generateFromPrompt(
    _prompt: string,
  ): Promise<{ component: any; width: number; height: number }> {
    const width = 300 + Math.floor(Math.random() * 200); // 300-500
    const height = 500 + Math.floor(Math.random() * 200); // 500-700
    const locations: ObjectLocation[] = Array.from({ length: 5 }, (_, i) => {
      const w = Math.floor(40 + Math.random() * 120);
      const h = Math.floor(40 + Math.random() * 120);
      const l = Math.floor(Math.random() * (width - w));
      const t = Math.floor(Math.random() * (height - h));
      const zIndex = Math.floor(Math.random() * 10) + 1;
      const rotation = Math.floor(Math.random() * 360);
      const id = `obj-${Date.now()}-${i}-${Math.floor(Math.random() * 10000)}`;
      if (!_objectData[id]) {
        _objectData[id] = [
          { key: 'name', value: `Object ${id}` },
          { key: 'type', value: 'rectangle' },
          {
            key: 'background',
            value: `repeating-linear-gradient(135deg, #e0e0e0 0 8px, #bdbdbd 8px 16px)`,
          },
          { key: 'borderRadius', value: '8' },
          { key: 'opacity', value: '0.7' },
        ];
      }
      return { id, top: t, left: l, width: w, height: h, zIndex, rotation };
    });
    const component = () => (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
        }}
      >
        {_currentLocations.map((obj: ObjectLocation, idx: number) => {
          const data = _objectData[obj.id];
          const bg = data
            ? data.find((kv) => kv.key === 'background')?.value ||
              `repeating-linear-gradient(135deg, #e0e0e0 0 8px, #bdbdbd 8px 16px)`
            : `repeating-linear-gradient(135deg, #e0e0e0 0 8px, #bdbdbd 8px 16px)`;
          const borderRadius = data
            ? parseFloat(
                data.find((kv) => kv.key === 'borderRadius')?.value || '8',
              )
            : 8;
          const opacity = data
            ? parseFloat(
                data.find((kv) => kv.key === 'opacity')?.value || '0.7',
              )
            : 0.7;
          return (
            <div
              key={obj.id}
              style={{
                position: 'absolute',
                top: obj.top,
                left: obj.left,
                width: obj.width,
                height: obj.height,
                background: bg,
                borderRadius: borderRadius,
                opacity: opacity,
                zIndex: obj.zIndex,
                transform: `rotate(${obj.rotation}deg)`,
              }}
            />
          );
        })}
      </div>
    );
    return new Promise((resolve) => {
      setTimeout(() => {
        _currentLocations = locations;
        resolve({ component, width, height });
      }, 1000);
    });
  },
  setObjectLocation(index: number, newLocation: ObjectLocation): void {
    if (Array.isArray(_currentLocations)) {
      _currentLocations = _currentLocations.map(
        (obj: ObjectLocation, i: number) => (i === index ? newLocation : obj),
      );
      if (typeof (window as any)._onLocationsChanged === 'function') {
        (window as any)._onLocationsChanged(_currentLocations);
      }
    }
  },
  getObjectData(id: string): ObjectDataPair[] {
    if (!_objectData[id]) {
      _objectData[id] = [
        { key: 'name', value: `Object ${id}` },
        { key: 'type', value: 'rectangle' },
        {
          key: 'background',
          value: `repeating-linear-gradient(135deg, #e0e0e0 0 8px, #bdbdbd 8px 16px)`,
        },
        { key: 'borderRadius', value: '8' },
        { key: 'opacity', value: '0.7' },
      ];
    }
    return _objectData[id];
  },
  setObjectData(id: string, arr: ObjectDataPair[]): void {
    _objectData[id] = arr;
  },
};

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <Editor editorImpl={editorImpl} />
    </StrictMode>,
  );
}
