import React, { useRef, useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function SignaturePad({ onSave, initialSignature }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(!!initialSignature);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Set canvas resolution for sharper drawing
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    const rootStyles = getComputedStyle(document.documentElement);
    const strokeColor = rootStyles.getPropertyValue('--foreground').trim() || '#000';
    ctx.strokeStyle = strokeColor;

    if (initialSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = initialSignature;
    }
  }, [initialSignature, theme]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault(); // Prevent scrolling
    
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const signatureBase64 = canvas.toDataURL('image/png');
    onSave(signatureBase64);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSave(null);
  };

  return (
    <div className="signature-wrapper">
      <div className="signature-label">
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--muted-foreground)' }}>Assinatura do Cliente</span>
      </div>
      <div className="signature-container">
        <canvas
          ref={canvasRef}
          className="signature-canvas"
          style={{ height: '200px' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseOut={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
        />
        <div className="signature-actions">
          <span style={{ fontSize: '11px', color: 'var(--muted-foreground)' }}>
            {hasSignature ? 'Assinatura capturada' : 'Assine acima'}
          </span>
          <button 
            type="button" 
            className="btn-text btn-sm" 
            onClick={clear}
            style={{ color: 'var(--danger)' }}
          >
            Limpar
          </button>
        </div>
      </div>
    </div>
  );
}
