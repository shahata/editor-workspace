// src/globals.js

if (typeof window !== 'undefined' && !window.getObjectLocations) {
  window.getObjectLocations = function () {
    return window._currentLocations || [];
  };
}

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
    window._currentLocations = locations;
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
        {(window._currentLocations || []).map((obj, idx) => (
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

if (typeof window !== 'undefined' && !window.setObjectLocation) {
  window.setObjectLocation = function (index, newLocation) {
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
