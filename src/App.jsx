import React, { useState, useRef, useEffect } from 'react';
import './globals.jsx';

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
  const dragInfo = useRef({
    idx: null,
    localAnchorX: 0,
    localAnchorY: 0,
    origRotation: 0,
    origWidth: 0,
    origHeight: 0,
  });
  const [generatedComponentKey, setGeneratedComponentKey] = useState(0);
  const handleResizeInfo = useRef({
    idx: null,
    handle: null,
    startX: 0,
    startY: 0,
    orig: null,
  });
  const rotateInfo = useRef({
    idx: null,
    startAngle: 0,
    origRotation: 0,
    cx: 0,
    cy: 0,
  });

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

  // Drag handlers for overlays
  const handleMouseDown = (e, idx, obj) => {
    if (pending) return;
    setSelectedIdx(idx);
    // Compute center of the rectangle
    const cx = obj.left + obj.width / 2;
    const cy = obj.top + obj.height / 2;
    // Vector from center to mouse
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const angle = (obj.rotation || 0) * (Math.PI / 180);
    // Rotate this vector by -angle to get the local anchor
    const localAnchorX = dx * Math.cos(-angle) - dy * Math.sin(-angle);
    const localAnchorY = dx * Math.sin(-angle) + dy * Math.cos(-angle);
    dragInfo.current = {
      idx,
      localAnchorX,
      localAnchorY,
      origRotation: obj.rotation || 0,
      origWidth: obj.width,
      origHeight: obj.height,
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    const {
      idx,
      localAnchorX,
      localAnchorY,
      origRotation,
      origWidth,
      origHeight,
    } = dragInfo.current;
    if (idx === null) return;
    const angle = (origRotation || 0) * (Math.PI / 180);
    // Rotate the local anchor by +angle to get the screen vector
    const rotatedAnchorX =
      localAnchorX * Math.cos(angle) - localAnchorY * Math.sin(angle);
    const rotatedAnchorY =
      localAnchorX * Math.sin(angle) + localAnchorY * Math.cos(angle);
    // The new center is at mouse position minus rotated anchor
    const newCx = e.clientX - rotatedAnchorX;
    const newCy = e.clientY - rotatedAnchorY;
    // Update left/top so that center is at (newCx, newCy)
    const newLeft = newCx - origWidth / 2;
    const newTop = newCy - origHeight / 2;
    setOverlayLocations((prev) =>
      prev.map((obj, i) => {
        if (i === idx) {
          const newObj = { ...obj, top: newTop, left: newLeft };
          if (window.setObjectLocation) {
            window.setObjectLocation(idx, newObj);
          }
          return newObj;
        }
        return obj;
      }),
    );
  };

  const handleMouseUp = () => {
    const { idx } = dragInfo.current;
    if (idx === null) return;
    dragInfo.current = {
      idx: null,
      localAnchorX: 0,
      localAnchorY: 0,
      origRotation: 0,
      origWidth: 0,
      origHeight: 0,
    };
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  // Unselect when clicking anywhere on the document
  const handleDocumentClick = (e) => {
    // Only unfocus if the click is not on an overlay
    if (!e.target.closest('[data-overlay]')) {
      setSelectedIdx(null);
    }
  };

  useEffect(() => {
    document.body.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.body.removeEventListener('mousedown', handleDocumentClick);
    };
  }, []);

  // --- Resize handles logic ---
  const handleResizeMouseDown = (e, idx, handle, obj) => {
    e.stopPropagation();
    if (pending) return;
    setSelectedIdx(idx);
    handleResizeInfo.current = {
      idx,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...obj },
    };
    window.addEventListener('mousemove', handleResizeMouseMove);
    window.addEventListener('mouseup', handleResizeMouseUp);
  };

  const handleResizeMouseMove = (e) => {
    const { idx, handle, startX, startY, orig } = handleResizeInfo.current;
    if (idx === null || !handle) return;
    // Calculate mouse delta in screen coordinates (ignore rotation)
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    setOverlayLocations((prev) =>
      prev.map((obj, i) => {
        if (i !== idx) return obj;
        let { top, left, width, height } = orig;
        let newTop = top,
          newLeft = left,
          newWidth = width,
          newHeight = height;
        // Corner handles
        if (handle === 'nw') {
          newTop += dy;
          newLeft += dx;
          newWidth -= dx;
          newHeight -= dy;
        } else if (handle === 'ne') {
          newTop += dy;
          newWidth += dx;
          newHeight -= dy;
        } else if (handle === 'sw') {
          newLeft += dx;
          newWidth -= dx;
          newHeight += dy;
        } else if (handle === 'se') {
          newWidth += dx;
          newHeight += dy;
        } else if (handle === 'n') {
          newTop += dy;
          newHeight -= dy;
        } else if (handle === 's') {
          newHeight += dy;
        } else if (handle === 'w') {
          newLeft += dx;
          newWidth -= dx;
        } else if (handle === 'e') {
          newWidth += dx;
        }
        // Minimum size
        newWidth = Math.max(20, newWidth);
        newHeight = Math.max(20, newHeight);
        const newObj = {
          ...obj,
          top: newTop,
          left: newLeft,
          width: newWidth,
          height: newHeight,
        };
        if (window.setObjectLocation) {
          window.setObjectLocation(idx, newObj);
        }
        return newObj;
      }),
    );
  };

  const handleResizeMouseUp = () => {
    handleResizeInfo.current = {
      idx: null,
      handle: null,
      startX: 0,
      startY: 0,
      orig: null,
    };
    window.removeEventListener('mousemove', handleResizeMouseMove);
    window.removeEventListener('mouseup', handleResizeMouseUp);
  };

  // --- End resize handles logic ---

  // Add rotation handle logic
  const handleRotateMouseDown = (e, idx, obj, cx, cy) => {
    e.stopPropagation();
    if (pending) return;
    setSelectedIdx(idx);
    // Calculate angle from center to mouse
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const startAngle = Math.atan2(dy, dx);
    rotateInfo.current = {
      idx,
      startAngle,
      origRotation: obj.rotation || 0,
      cx,
      cy,
    };
    window.addEventListener('mousemove', handleRotateMouseMove);
    window.addEventListener('mouseup', handleRotateMouseUp);
  };

  const handleRotateMouseMove = (e) => {
    const { idx, startAngle, origRotation, cx, cy } = rotateInfo.current;
    if (idx === null) return;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const angle = Math.atan2(dy, dx);
    let deltaDeg = ((angle - startAngle) * 180) / Math.PI;
    // Normalize to [-180, 180]
    if (deltaDeg < -180) deltaDeg += 360;
    if (deltaDeg > 180) deltaDeg -= 360;
    const newRotation = (((origRotation + deltaDeg) % 360) + 360) % 360;
    setOverlayLocations((prev) =>
      prev.map((obj, i) => {
        if (i === idx) {
          const newObj = { ...obj, rotation: newRotation };
          if (window.setObjectLocation) {
            window.setObjectLocation(idx, newObj);
          }
          return newObj;
        }
        return obj;
      }),
    );
  };

  const handleRotateMouseUp = () => {
    rotateInfo.current = {
      idx: null,
      startAngle: 0,
      origRotation: 0,
      cx: 0,
      cy: 0,
    };
    window.removeEventListener('mousemove', handleRotateMouseMove);
    window.removeEventListener('mouseup', handleRotateMouseUp);
  };

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
            const isSelected = selectedIdx === idx;
            const handleSize = 12;
            const half = handleSize / 2;
            // Helper to rotate a point (px, py) around center (cx, cy) by angle (deg)
            function rotatePoint(px, py, cx, cy, angle) {
              const rad = (angle * Math.PI) / 180;
              const dx = px - cx;
              const dy = py - cy;
              const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
              const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
              return [cx + rx, cy + ry];
            }
            const cx = obj.left + obj.width / 2;
            const cy = obj.top + obj.height / 2;
            const angle = obj.rotation || 0;
            const rawHandles = isSelected
              ? [
                  { pos: 'nw', x: obj.left, y: obj.top },
                  { pos: 'n', x: obj.left + obj.width / 2, y: obj.top },
                  { pos: 'ne', x: obj.left + obj.width, y: obj.top },
                  {
                    pos: 'e',
                    x: obj.left + obj.width,
                    y: obj.top + obj.height / 2,
                  },
                  {
                    pos: 'se',
                    x: obj.left + obj.width,
                    y: obj.top + obj.height,
                  },
                  {
                    pos: 's',
                    x: obj.left + obj.width / 2,
                    y: obj.top + obj.height,
                  },
                  { pos: 'sw', x: obj.left, y: obj.top + obj.height },
                  { pos: 'w', x: obj.left, y: obj.top + obj.height / 2 },
                ]
              : [];
            const handles = rawHandles.map((h) => {
              const [rx, ry] = rotatePoint(h.x, h.y, cx, cy, angle);
              return { ...h, x: rx, y: ry };
            });
            const rotationHandle =
              isSelected &&
              (() => {
                // Find the 'n' handle position
                const nHandle = handles.find((h) => h.pos === 'n');
                if (!nHandle) return null;
                // Place rotation handle 32px above the 'n' handle, along the rotated normal
                const dist = 32;
                const dx = nHandle.x - cx;
                const dy = nHandle.y - cy;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const rx = nHandle.x + (dx / len) * dist;
                const ry = nHandle.y + (dy / len) * dist;
                return {
                  x: rx,
                  y: ry,
                };
              })();
            return (
              <React.Fragment key={idx}>
                <div
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
                      hoveredIdx === idx || isSelected
                        ? '2px solid #4fc3f7'
                        : '2px solid transparent',
                    borderRadius: 8,
                    boxSizing: 'border-box',
                    transition: 'border 0.15s, background 0.15s',
                    pointerEvents: 'auto',
                    cursor: pending
                      ? 'not-allowed'
                      : isSelected
                      ? 'move'
                      : 'pointer',
                    zIndex: obj.zIndex,
                    transform: `rotate(${obj.rotation}deg)`,
                  }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onMouseDown={(e) => handleMouseDown(e, idx, obj)}
                  onClick={() => setSelectedIdx(idx)}
                  title={`Object ${idx + 1}`}
                />
                {isSelected &&
                  handles.map((h) => (
                    <div
                      key={h.pos}
                      style={{
                        position: 'absolute',
                        top: h.y - half,
                        left: h.x - half,
                        width: handleSize,
                        height: handleSize,
                        background: '#fff',
                        border: '2px solid #1976d2',
                        borderRadius: '50%',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                        zIndex: 1000,
                        cursor:
                          h.pos === 'n' || h.pos === 's'
                            ? 'ns-resize'
                            : h.pos === 'e' || h.pos === 'w'
                            ? 'ew-resize'
                            : h.pos === 'ne' || h.pos === 'sw'
                            ? 'nesw-resize'
                            : h.pos === 'nw' || h.pos === 'se'
                            ? 'nwse-resize'
                            : 'pointer',
                        pointerEvents: 'auto',
                      }}
                      onMouseDown={(e) =>
                        handleResizeMouseDown(e, idx, h.pos, obj)
                      }
                    />
                  ))}
                {isSelected && rotationHandle && (
                  <div
                    style={{
                      position: 'absolute',
                      top: rotationHandle.y - half,
                      left: rotationHandle.x - half,
                      width: handleSize,
                      height: handleSize,
                      background: '#fff',
                      border: '2px solid #ff9800',
                      borderRadius: '50%',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                      zIndex: 1001,
                      cursor: 'grab',
                      pointerEvents: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseDown={(e) =>
                      handleRotateMouseDown(e, idx, obj, cx, cy)
                    }
                    title="Rotate"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      style={{ display: 'block' }}
                    >
                      <path
                        d="M8 2a6 6 0 1 1-4.24 1.76"
                        fill="none"
                        stroke="#ff9800"
                        strokeWidth="2"
                      />
                      <polyline
                        points="2,2 8,2 8,8"
                        fill="none"
                        stroke="#ff9800"
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
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
