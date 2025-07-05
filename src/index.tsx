import { useState, useRef, useEffect, createElement, Fragment } from 'react';
import type { FC } from 'react';
import Moveable from 'react-moveable';
import { flushSync } from 'react-dom';

export type ObjectLocation = {
  id: string;
  top: number;
  left: number;
  width: number;
  height: number;
  zIndex: number;
  rotation: number;
};

export type ObjectDataPair = {
  key: string;
  value: string;
};

export type EditorImplementation = {
  getObjectLocations: () => ObjectLocation[];
  generateFromPrompt: (
    prompt: string,
  ) => Promise<{ component: FC; width: number; height: number }>;
  setObjectLocation: (id: string, newLocation: ObjectLocation) => void;
  getObjectData: (id: string) => ObjectDataPair[];
  setObjectData: (id: string, data: ObjectDataPair[]) => void;
};

export function Editor({ editorImpl }: { editorImpl: EditorImplementation }) {
  const [text, setText] = useState<string>('');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [showAreas, setShowAreas] = useState<boolean>(false);
  const [pending, setPending] = useState<boolean>(false);
  const [boardWidth, setBoardWidth] = useState<number>(375);
  const [boardHeight, setBoardHeight] = useState<number>(667);
  const [generatedComponent, setGeneratedComponent] = useState<React.FC | null>(
    null,
  );
  const [overlayLocations, setOverlayLocations] = useState<ObjectLocation[]>(
    () => editorImpl.getObjectLocations(),
  );
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const overlayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const whiteboardRef = useRef<HTMLDivElement | null>(null);
  const minBoardWidth = 200;
  const minBoardHeight = 200;
  const isResizing = useRef<
    | null
    | { type: 'width'; startX: number; startWidth: number }
    | { type: 'height'; startY: number; startHeight: number }
  >(null);
  const [sidepanelData, setSidepanelData] = useState<ObjectDataPair[] | null>(
    null,
  );
  const [sidepanelId, setSidepanelId] = useState<string | null>(null);
  const newKeyInputRef = useRef<HTMLInputElement | null>(null);
  const [sidepanelPos, setSidepanelPos] = useState<{
    top: number;
    bottom: number;
  }>({ top: 0, bottom: 0 });
  const [moveableRerenderKey, setMoveableRerenderKey] = useState<number>(0);

  useEffect(() => {
    // Ensure refs array matches overlays
    overlayRefs.current = overlayLocations.map(
      (_: ObjectLocation, i: number) => overlayRefs.current[i] || null,
    );
  }, [overlayLocations.length]);

  useEffect(() => {
    function handleDocumentClick(e: MouseEvent) {
      // Unfocus if click is not on an overlay, Moveable handle, or the sidepanel
      const target = e.target as HTMLElement;
      const isOverlay = target.closest('[data-overlay]');
      const isMoveable = target.closest(
        '.moveable-control, .moveable-line, .moveable-area',
      );
      const isSidepanel = target.closest('[data-sidepanel]');
      if (!isOverlay && !isMoveable && !isSidepanel) {
        setSelectedIdx(null);
      }
    }
    document.body.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.body.removeEventListener('mousedown', handleDocumentClick);
    };
  }, []);

  useEffect(() => {
    setOverlayLocations((prev: ObjectLocation[]) =>
      prev.map((obj: ObjectLocation, i: number) => {
        if (!obj.id) obj.id = `obj-${i}`;
        return obj;
      }),
    );
  }, []);

  useEffect(() => {
    if (
      selectedIdx !== null &&
      overlayLocations[selectedIdx] &&
      editorImpl.getObjectData
    ) {
      const id = overlayLocations[selectedIdx].id;
      setSidepanelId(id);
      const data = editorImpl.getObjectData(id);
      setSidepanelData(Array.isArray(data) ? data : []);
    } else {
      setSidepanelId(null);
      setSidepanelData(null);
    }
  }, [selectedIdx, overlayLocations]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSelectedIdx(null);
    setPending(true);
    const result = await editorImpl.generateFromPrompt(text);
    if (result && result.component && result.width && result.height) {
      setGeneratedComponent(() => result.component);
      setBoardWidth(result.width);
      setBoardHeight(result.height);
    }
    setOverlayLocations(editorImpl.getObjectLocations());
    setText('');
    setPending(false);
  };

  const handleRefresh = () => {
    setOverlayLocations(editorImpl.getObjectLocations());
  };

  // Single Moveable instance for selected overlay
  const selectedRef =
    selectedIdx !== null ? overlayRefs.current[selectedIdx] : null;
  const selectedObj =
    selectedIdx !== null ? overlayLocations[selectedIdx] : null;

  function handleBoardResizeMouseDown(
    e: React.MouseEvent,
    type: 'width' | 'height',
  ) {
    e.preventDefault();
    if (type === 'width') {
      isResizing.current = {
        type,
        startX: e.clientX,
        startWidth: boardWidth,
      };
    } else if (type === 'height') {
      isResizing.current = {
        type,
        startY: e.clientY,
        startHeight: boardHeight,
      };
    }
    window.addEventListener('mousemove', handleBoardResizeMouseMove);
    window.addEventListener('mouseup', handleBoardResizeMouseUp);
  }

  function handleBoardResizeMouseMove(e: MouseEvent) {
    if (!isResizing.current) return;
    if (isResizing.current.type === 'width') {
      const dx = e.clientX - isResizing.current.startX;
      setBoardWidth(
        Math.max(minBoardWidth, isResizing.current.startWidth + dx),
      );
    } else if (isResizing.current.type === 'height') {
      const dy = e.clientY - isResizing.current.startY;
      setBoardHeight(
        Math.max(minBoardHeight, isResizing.current.startHeight + dy),
      );
    }
  }

  function handleBoardResizeMouseUp() {
    isResizing.current = null;
    window.removeEventListener('mousemove', handleBoardResizeMouseMove);
    window.removeEventListener('mouseup', handleBoardResizeMouseUp);
  }

  function handleSidepanelChange(idx: number, newValue: string) {
    setSidepanelData((prev: ObjectDataPair[] | null) => {
      if (!prev) return prev;
      const updated = prev.map((kv: ObjectDataPair, i: number) =>
        i === idx ? { ...kv, value: newValue } : kv,
      );
      if (sidepanelId) {
        editorImpl.setObjectData(sidepanelId, updated);
      }
      return updated;
    });
  }

  // Update sidepanel position when board size/position changes
  useEffect(() => {
    function updatePanelPos() {
      const board = whiteboardRef.current;
      const prompt = document.querySelector('form');
      if (board && prompt) {
        const boardRect = board.getBoundingClientRect();
        const promptRect = prompt.getBoundingClientRect();
        setSidepanelPos({
          top: boardRect.top,
          bottom: window.innerHeight - promptRect.top + 24, // 24px gap above prompt
        });
      }
    }
    updatePanelPos();
    window.addEventListener('resize', updatePanelPos);
    return () => window.removeEventListener('resize', updatePanelPos);
  }, [boardWidth, boardHeight]);

  useEffect(() => {
    // Also update on mount and when overlays change (in case of board move)
    setTimeout(() => {
      const board = whiteboardRef.current;
      const prompt = document.querySelector('form');
      if (board && prompt) {
        const boardRect = board.getBoundingClientRect();
        const promptRect = prompt.getBoundingClientRect();
        setSidepanelPos({
          top: boardRect.top,
          bottom: window.innerHeight - promptRect.top + 24,
        });
      }
    }, 0);
  }, [sidepanelData, boardWidth, boardHeight]);

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
        ref={whiteboardRef}
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
        {generatedComponent ? createElement(generatedComponent) : null}
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
              <Fragment key={idx}>
                <div
                  ref={(el) => {
                    overlayRefs.current[idx] = el;
                  }}
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
                    pointerEvents: 'auto',
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
              </Fragment>
            );
          })}
        </div>
        {/* Right (width) resize handle */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: '-24px', // 10px gap + 18px bar width/2
            width: 28,
            height: 70,
            transform: 'translateY(-50%)',
            background: 'none',
            cursor: 'ew-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100001,
            userSelect: 'none',
            outline: '1.5px solid #bbb',
            borderRadius: 8,
          }}
          onMouseDown={(e) => handleBoardResizeMouseDown(e, 'width')}
          title="Resize width"
        >
          <div
            style={{
              width: 18,
              height: 60,
              background: '#333',
              borderRadius: 6,
            }}
          />
        </div>
        {/* Bottom (height) resize handle */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '-24px', // 10px gap + 18px bar height/2
            width: 70,
            height: 28,
            transform: 'translateX(-50%)',
            background: 'none',
            cursor: 'ns-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100001,
            userSelect: 'none',
            outline: '1.5px solid #bbb',
            borderRadius: 8,
          }}
          onMouseDown={(e) => handleBoardResizeMouseDown(e, 'height')}
          title="Resize height"
        >
          <div
            style={{
              height: 18,
              width: 60,
              background: '#333',
              borderRadius: 6,
            }}
          />
        </div>
      </div>
      {selectedRef && selectedObj && (
        <Moveable
          key={`moveable-${selectedIdx}-${moveableRerenderKey}`}
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
            const newObj = { ...selectedObj, left, top };
            flushSync(() => {
              setOverlayLocations((prev) =>
                prev.map((o, i) => (i === selectedIdx ? newObj : o)),
              );
            });
            if (selectedObj) {
              editorImpl.setObjectLocation(selectedObj.id, newObj);
            }
          }}
          onResize={({ width, height, drag }) => {
            const { left, top } = drag;
            const newObj = { ...selectedObj, width, height, left, top };
            flushSync(() => {
              setOverlayLocations((prev) =>
                prev.map((o, i) => (i === selectedIdx ? newObj : o)),
              );
            });
            if (selectedObj) {
              editorImpl.setObjectLocation(selectedObj.id, newObj);
            }
          }}
          onRotate={({ beforeRotate }) => {
            const newObj = { ...selectedObj, rotation: beforeRotate };
            flushSync(() => {
              setOverlayLocations((prev) =>
                prev.map((o, i) => (i === selectedIdx ? newObj : o)),
              );
            });
            if (selectedObj) {
              editorImpl.setObjectLocation(selectedObj.id, newObj);
            }
          }}
          rotation={selectedObj.rotation || 0}
          left={selectedObj.left}
          top={selectedObj.top}
          width={selectedObj.width}
          height={selectedObj.height}
        />
      )}
      {/* Sidepanel for object data editing */}
      {sidepanelData &&
        selectedIdx !== null &&
        overlayLocations[selectedIdx] && (
          <div
            data-sidepanel
            style={{
              position: 'fixed',
              top: sidepanelPos.top,
              right: 0,
              width: 340,
              bottom: sidepanelPos.bottom,
              background: '#fff',
              boxShadow: '-4px 0 16px rgba(0,0,0,0.10)',
              zIndex: 200000,
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              borderTopLeftRadius: 24,
              borderBottomLeftRadius: 24,
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
              overflow: 'hidden',
              overflowY: 'auto',
            }}
          >
            <h3
              style={{
                margin: 0,
                marginBottom: 16,
                fontWeight: 700,
                fontSize: 22,
              }}
            >
              Object Data
            </h3>
            {sidepanelData.map((kv, i) => (
              <div
                key={kv.key}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ minWidth: 80, fontWeight: 500 }}>{kv.key}</span>
                <input
                  type="text"
                  value={kv.value}
                  onChange={(e) => handleSidepanelChange(i, e.target.value)}
                  style={{
                    flex: 1,
                    padding: 6,
                    borderRadius: 4,
                    border: '1px solid #bbb',
                    fontSize: 16,
                  }}
                  ref={
                    i === sidepanelData.length - 1 ? newKeyInputRef : undefined
                  }
                />
              </div>
            ))}
            {/* Object location fields */}
            <div
              style={{
                marginTop: 24,
                borderTop: '1px solid #eee',
                paddingTop: 16,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Location</div>
              {(
                [
                  'top',
                  'left',
                  'width',
                  'height',
                  'rotation',
                  'zIndex',
                ] as const
              ).map((field) => (
                <div
                  key={field}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ minWidth: 80 }}>
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </span>
                  <input
                    type="number"
                    value={getLocationFieldValue(
                      overlayLocations[selectedIdx],
                      field,
                    )}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      const obj = overlayLocations[selectedIdx];
                      if (!obj) return;
                      const newObj = { ...obj, [field]: value };
                      setOverlayLocations((prev) =>
                        prev.map((o, i) => (i === selectedIdx ? newObj : o)),
                      );
                      if (selectedObj) {
                        editorImpl.setObjectLocation(selectedObj.id, newObj);
                      }
                      setMoveableRerenderKey((k) => k + 1); // force Moveable remount
                    }}
                    style={{
                      flex: 1,
                      padding: 6,
                      borderRadius: 4,
                      border: '1px solid #bbb',
                      fontSize: 16,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
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

// Helper for type-safe access to ObjectLocation fields
function getLocationFieldValue(
  obj: ObjectLocation | undefined,
  field: 'top' | 'left' | 'width' | 'height' | 'rotation' | 'zIndex',
): number {
  if (!obj) return 0;
  switch (field) {
    case 'top':
      return obj.top;
    case 'left':
      return obj.left;
    case 'width':
      return obj.width;
    case 'height':
      return obj.height;
    case 'rotation':
      return obj.rotation ?? 0;
    case 'zIndex':
      return obj.zIndex ?? 0;
    default:
      return 0;
  }
}
