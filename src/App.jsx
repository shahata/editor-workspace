import React, { useState, useEffect, useRef } from 'react';
import './globals.jsx';
import Moveable from 'react-moveable';
import { flushSync } from 'react-dom';

// Assign the default getObjectLocations globally, outside the component
if (typeof window !== 'undefined' && !window.getObjectLocations) {
  window.getObjectLocations = function () {
    return [];
  };
}

// Assign the default generateFromPrompt globally, outside the component
if (typeof window !== 'undefined' && !window.generateFromPrompt) {
  window.generateFromPrompt = function () {
    // New random board size
    const width = 300 + Math.floor(Math.random() * 200); // 300-500
    const height = 500 + Math.floor(Math.random() * 200); // 500-700
    // Generate 5 random rectangles with random zIndex and rotation
    const locations = Array.from({ length: 5 }, () => {
      const w = Math.floor(40 + Math.random() * 120);
      const h = Math.floor(40 + Math.random() * 120);
      const l = Math.floor(Math.random() * (width - w));
      const t = Math.floor(Math.random() * (height - h));
      const zIndex = Math.floor(Math.random() * 10) + 1; // 1-10
      const rotation = Math.floor(Math.random() * 360); // 0-359 degrees
      return { top: t, left: l, width: w, height: h, zIndex, rotation };
    });
    // The component to render (placeholder look: diagonal lines pattern)
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
        {locations.map((obj, idx) => (
          <div
            key={idx}
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
    return new Promise((resolve) =>
      setTimeout(() => resolve({ component, width, height, locations }), 1000),
    );
  };
}

export default function App() {
  const [text, setText] = useState('');
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [showAreas, setShowAreas] = useState(false);
  const [pending, setPending] = useState(false);
  const [boardWidth, setBoardWidth] = useState(375);
  const [boardHeight, setBoardHeight] = useState(667);
  const [generatedComponent, setGeneratedComponent] = useState(null);
  const [overlayLocations, setOverlayLocations] = useState(
    typeof window !== 'undefined' && window.getObjectLocations
      ? window.getObjectLocations()
      : [],
  );
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [generatedComponentKey, setGeneratedComponentKey] = useState(0);
  const overlayRefs = useRef([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window._onLocationsChanged = (newLocations) => {
        setOverlayLocations(Array.isArray(newLocations) ? newLocations : []);
        setGeneratedComponentKey((k) => k + 1); // force re-render of generated component
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        window._onLocationsChanged = undefined;
      }
    };
  }, []);

  useEffect(() => {
    // Ensure refs array matches overlays
    overlayRefs.current = overlayLocations.map(
      (_, i) => overlayRefs.current[i] || React.createRef(),
    );
  }, [overlayLocations.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSelectedIdx(null);
    if (typeof window !== 'undefined' && window.generateFromPrompt) {
      setPending(true);
      const result = await window.generateFromPrompt(text);
      if (
        result &&
        result.component &&
        result.width &&
        result.height &&
        result.locations
      ) {
        setGeneratedComponent(() => result.component);
        setBoardWidth(result.width);
        setBoardHeight(result.height);
        // Update global getObjectLocations to return the new locations
        if (window.getObjectLocations) {
          window.getObjectLocations = () => result.locations;
        }
      }
      setOverlayLocations(
        window.getObjectLocations ? window.getObjectLocations() : [],
      );
      setPending(false);
    }
    setText('');
  };

  const handleRefresh = () => {
    if (typeof window !== 'undefined' && window.getObjectLocations) {
      setOverlayLocations(window.getObjectLocations());
    }
  };

  // Single Moveable instance for selected overlay
  const selectedRef =
    selectedIdx !== null ? overlayRefs.current[selectedIdx] : null;
  const selectedObj =
    selectedIdx !== null ? overlayLocations[selectedIdx] : null;

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        background: '#f0f0f0',
        position: 'relative',
      }}
    >
      {/* Left panel with buttons */}
      <div
        style={{
          position: 'fixed',
          top: 32,
          left: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          zIndex: 100,
        }}
      >
        <button
          onClick={() => setShowAreas((v) => !v)}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: '1px solid #1976d2',
            background: showAreas ? '#1976d2' : '#fff',
            color: showAreas ? '#fff' : '#1976d2',
            fontWeight: 'bold',
            fontSize: 16,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          {showAreas ? 'Hide Areas' : 'Show Areas'}
        </button>
        <button
          onClick={handleRefresh}
          style={{
            padding: '10px 18px',
            borderRadius: 8,
            border: '1px solid #1976d2',
            background: '#fff',
            color: '#1976d2',
            fontWeight: 'bold',
            fontSize: 16,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            transition: 'background 0.2s, color 0.2s',
          }}
        >
          Refresh
        </button>
      </div>
      <div
        style={{
          width: boardWidth,
          height: boardHeight,
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
          position: 'relative',
          marginTop: 48,
          marginBottom: 0,
          overflow: 'hidden',
        }}
      >
        {/* Render the generated component (from the promise) */}
        {generatedComponent
          ? React.createElement(generatedComponent, {
              key: generatedComponentKey,
            })
          : null}
        {/* Render overlays for hover/fill, always on top */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          {overlayLocations.map((obj, idx) => {
            return (
              <React.Fragment key={idx}>
                <div
                  ref={(el) => (overlayRefs.current[idx] = el)}
                  data-overlay
                  style={{
                    position: 'absolute',
                    top: obj.top,
                    left: obj.left,
                    width: obj.width,
                    height: obj.height,
                    background: showAreas
                      ? 'rgba(227, 227, 227, 0.6)'
                      : 'transparent',
                    border:
                      hoveredIdx === idx || selectedIdx === idx
                        ? '2px solid #4fc3f7'
                        : '2px solid transparent',
                    borderRadius: 8,
                    boxSizing: 'border-box',
                    transition: 'border 0.15s, background 0.15s',
                    pointerEvents: selectedIdx === idx ? 'none' : 'auto',
                    cursor: pending
                      ? 'not-allowed'
                      : selectedIdx === idx
                      ? 'move'
                      : 'pointer',
                    zIndex: obj.zIndex,
                    transform: `rotate(${obj.rotation}deg)`,
                  }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => setSelectedIdx(idx)}
                  title={`Object ${idx + 1}`}
                />
              </React.Fragment>
            );
          })}
        </div>
      </div>
      {selectedRef && selectedObj && (
        <Moveable
          key={`moveable-${selectedIdx}`}
          target={selectedRef}
          origin={false}
          draggable={!pending}
          resizable={!pending}
          rotatable={!pending}
          throttleResize={0}
          throttleDrag={0}
          throttleRotate={0}
          edge={false}
          keepRatio={false}
          renderDirections={['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']}
          rotationPosition="top"
          props={{
            style: { zIndex: 99999 },
          }}
          onDrag={({ left, top }) => {
            console.log('onDrag', left, top);
            const newObj = { ...selectedObj, left, top };
            flushSync(() => {
              setOverlayLocations((prev) =>
                prev.map((o, i) => (i === selectedIdx ? newObj : o)),
              );
            });
            if (window.setObjectLocation)
              window.setObjectLocation(selectedIdx, newObj);
          }}
          onResize={({ width, height, drag }) => {
            const { left, top } = drag;
            console.log('onResize', left, top, width, height);
            const newObj = { ...selectedObj, width, height, left, top };
            flushSync(() => {
              setOverlayLocations((prev) =>
                prev.map((o, i) => (i === selectedIdx ? newObj : o)),
              );
            });
            if (window.setObjectLocation)
              window.setObjectLocation(selectedIdx, newObj);
          }}
          onRotate={({ beforeRotate }) => {
            console.log('onRotate', beforeRotate);
            const newObj = { ...selectedObj, rotation: beforeRotate };
            flushSync(() => {
              setOverlayLocations((prev) =>
                prev.map((o, i) => (i === selectedIdx ? newObj : o)),
              );
            });
            if (window.setObjectLocation)
              window.setObjectLocation(selectedIdx, newObj);
          }}
          rotation={selectedObj.rotation || 0}
          left={selectedObj.left}
          top={selectedObj.top}
          width={selectedObj.width}
          height={selectedObj.height}
        />
      )}
      <form
        style={{
          width: 1125,
          maxWidth: '98vw',
          padding: 16,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'row',
          gap: 8,
          background: '#fafafa',
          borderRadius: 18,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          position: 'fixed',
          left: '50%',
          bottom: 24,
          transform: 'translateX(-50%)',
          justifyContent: 'center',
        }}
        onSubmit={handleSubmit}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          style={{
            flex: 1,
            resize: 'none',
            borderRadius: 8,
            border: '1px solid #ccc',
            padding: 8,
            fontSize: 16,
            minWidth: 0,
            minHeight: 80,
          }}
          placeholder="Type your message..."
          disabled={pending}
        />
        <button
          type="submit"
          style={{
            padding: '16px 32px',
            borderRadius: 8,
            border: 'none',
            background: '#1976d2',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 18,
            cursor: 'pointer',
            height: 'fit-content',
            alignSelf: 'center',
          }}
          disabled={pending}
        >
          {pending ? 'Generating...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
