import React from 'react';
import './global.d.ts';

declare global {
  interface Window {
    _objectData?: Record<string, ObjectDataPair[]>;
    _currentLocations?: ObjectLocation[];
    _onLocationsChanged?: (locations: ObjectLocation[]) => void;
  }
}

if (typeof window !== 'undefined' && !window.getObjectLocations) {
  window.getObjectLocations = function (): ObjectLocation[] {
    return window._currentLocations || [];
  };
}

if (typeof window !== 'undefined' && !window.generateFromPrompt) {
  window.generateFromPrompt = function (
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
      if (typeof window !== 'undefined') {
        if (!window._objectData) window._objectData = {};
        window._objectData[id] = [
          { key: 'id', value: `${id}` },
          { key: 'type', value: 'rectangle' },
          { key: 'note', value: '' },
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
        {(window._currentLocations || []).map((obj, idx) => (
          <div
            key={obj.id}
            style={{
              position: 'absolute',
              top: obj.top,
              left: obj.left,
              width: obj.width,
              height: obj.height,
              background: `repeating-linear-gradient(135deg, #e0e0e0 0 8px, #bdbdbd 8px 16px)`,
              borderRadius: 8,
              opacity: 0.7,
              zIndex: obj.zIndex,
              transform: `rotate(${obj.rotation}deg)`,
            }}
          />
        ))}
      </div>
    );
    return new Promise((resolve) => {
      setTimeout(() => {
        window._currentLocations = locations;
        resolve({ component, width, height });
      }, 1000);
    });
  };
}

if (typeof window !== 'undefined' && !window.setObjectLocation) {
  window.setObjectLocation = function (
    index: number,
    newLocation: ObjectLocation,
  ): void {
    if (Array.isArray(window._currentLocations)) {
      window._currentLocations = window._currentLocations.map((obj, i) =>
        i === index ? newLocation : obj,
      );
      if (typeof window._onLocationsChanged === 'function') {
        window._onLocationsChanged(window._currentLocations);
      }
    }
    console.log('setObjectLocation called:', { index, newLocation });
  };
}

if (typeof window !== 'undefined' && !window._objectData) {
  window._objectData = {};
}

if (typeof window !== 'undefined' && !window.getObjectData) {
  window.getObjectData = function (id: string): Promise<ObjectDataPair[]> {
    if (!window._objectData) window._objectData = {};
    if (!window._objectData[id]) {
      window._objectData[id] = [
        { key: 'name', value: `Object ${id}` },
        { key: 'type', value: 'rectangle' },
        { key: 'note', value: '' },
      ];
    }
    return Promise.resolve(window._objectData[id]);
  };
}

if (typeof window !== 'undefined' && !window.setObjectData) {
  window.setObjectData = function (id: string, arr: ObjectDataPair[]): void {
    if (!window._objectData) window._objectData = {};
    window._objectData[id] = arr;
    console.log('setObjectData', id, arr);
  };
}

export {};
