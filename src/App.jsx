import React, { useState } from 'react';

// Assign the default getObjectLocations globally, outside the component
if (typeof window !== 'undefined' && !window.getObjectLocations) {
  window.getObjectLocations = function () {
    return [
      { top: 50, left: 30, width: 100, height: 80 },
      { top: 200, left: 60, width: 120, height: 90 },
      { top: 350, left: 100, width: 80, height: 60 },
      { top: 100, left: 200, width: 140, height: 100 },
      { top: 400, left: 250, width: 110, height: 70 },
    ];
  };
}

// Assign the default generateFromPrompt globally, outside the component
if (typeof window !== 'undefined' && !window.generateFromPrompt) {
  window.generateFromPrompt = function () {
    // Whiteboard size
    const boardWidth = 375;
    const boardHeight = 667;
    // Generate 5 random rectangles
    const newLocations = Array.from({ length: 5 }, () => {
      const width = Math.floor(40 + Math.random() * 120);
      const height = Math.floor(40 + Math.random() * 120);
      const left = Math.floor(Math.random() * (boardWidth - width));
      const top = Math.floor(Math.random() * (boardHeight - height));
      return { top, left, width, height };
    });
    window.getObjectLocations = () => newLocations;
    return Promise.resolve();
  };
}

export default function App() {
  const [text, setText] = useState('');
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [objectLocations, setObjectLocations] = useState(
    typeof window !== 'undefined' && window.getObjectLocations
      ? window.getObjectLocations()
      : [],
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (typeof window !== 'undefined' && window.generateFromPrompt) {
      await window.generateFromPrompt();
      setObjectLocations(window.getObjectLocations());
    }
    setText('');
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
      <div
        style={{
          width: 375,
          height: 667,
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
        {/* Whiteboard content can go here */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          {objectLocations.map((obj, idx) => (
            <div
              key={idx}
              style={{
                position: 'absolute',
                top: obj.top,
                left: obj.left,
                width: obj.width,
                height: obj.height,
                background: '#e3e3e3',
                border:
                  hoveredIdx === idx
                    ? '2px solid #4fc3f7'
                    : '2px solid transparent',
                borderRadius: 8,
                boxSizing: 'border-box',
                transition: 'border 0.15s',
                cursor: 'pointer',
              }}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              title={`Object ${idx + 1}`}
            />
          ))}
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
        >
          Submit
        </button>
      </form>
    </div>
  );
}
