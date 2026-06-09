import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function Thumbnail({ src, alt = '', size = 'sm' }) {
  const dim = size === 'md' ? 'w-20 h-20' : 'w-10 h-10';
  const [pos, setPos] = useState(null);
  const ref = useRef(null);

  function handleMouseEnter() {
    if (!src) return;
    const rect = ref.current.getBoundingClientRect();
    // position:fixed es relativo al viewport, sin sumar scroll
    setPos({
      top: rect.top - 216,   // 200px imagen + 8px flecha + 8px espacio
      left: rect.left + rect.width / 2 - 100, // centrado
    });
  }

  function handleMouseLeave() {
    setPos(null);
  }

  if (!src) {
    return (
      <div className={`${dim} rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-lg shrink-0`}>
        👗
      </div>
    );
  }

  return (
    <>
      <img
        ref={ref}
        src={src}
        alt={alt}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`${dim} object-cover rounded-lg border border-gray-200 shadow-sm cursor-zoom-in shrink-0`}
      />

      {pos && createPortal(
        <div
          className="pointer-events-none fixed z-[9999]"
          style={{
            top: pos.top,
            left: pos.left,
          }}
        >
          <div className="rounded-xl overflow-hidden shadow-2xl border-2 border-white ring-1 ring-gray-300 bg-white">
            <img
              src={src}
              alt={alt}
              style={{ width: 200, height: 200, objectFit: 'cover', display: 'block' }}
            />
          </div>
          {/* Flechita */}
          <div className="mx-auto w-fit">
            <div style={{
              width: 0, height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid white',
              margin: '0 auto',
            }} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
