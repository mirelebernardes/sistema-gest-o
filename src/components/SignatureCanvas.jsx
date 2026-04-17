import React, { useState, useEffect } from 'react';
import { useBusinessContext } from '../context/BusinessContext';
import { useTheme } from '../context/ThemeContext';

export default function SignatureCanvas({ onSave }) {
  const { t } = useBusinessContext();
  const { theme } = useTheme();

    const canvasRef = React.useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const rootStyles = getComputedStyle(document.documentElement);
      const strokeColor = rootStyles.getPropertyValue('--foreground').trim() || '#000';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    }, [theme]);

    const startDrawing = (e) => {
      const { offsetX, offsetY } = e.nativeEvent.touches ? {
        offsetX: e.nativeEvent.touches[0].clientX - canvasRef.current.getBoundingClientRect().left,
        offsetY: e.nativeEvent.touches[0].clientY - canvasRef.current.getBoundingClientRect().top
      } : e.nativeEvent;
      const ctx = canvasRef.current.getContext('2d');
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
      setIsDrawing(true);
    };

    const draw = (e) => {
      if (!isDrawing) return;
      const { offsetX, offsetY } = e.nativeEvent.touches ? {
        offsetX: e.nativeEvent.touches[0].clientX - canvasRef.current.getBoundingClientRect().left,
        offsetY: e.nativeEvent.touches[0].clientY - canvasRef.current.getBoundingClientRect().top
      } : e.nativeEvent;
      const ctx = canvasRef.current.getContext('2d');
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
    };

    const stopDrawing = () => setIsDrawing(false);

    const clear = () => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    };

    return (
      <div className="signature-container">
        <canvas 
          ref={canvasRef}
          width={400}
          height={200}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div className="signature-actions">
          <button type="button" className="btn-secondary btn-sm" onClick={clear}>{t('clear')}</button>
          <button type="button" className="btn-primary btn-sm" onClick={() => onSave(canvasRef.current.toDataURL())}>{t('save_signature')}</button>
        </div>
      </div>
    );
  };
