import React from 'react';
import { MoonStar, SunMedium } from 'lucide-react';

import { useTheme } from '../context/ThemeContext';

const OPTIONS = [
  { value: 'light', label: 'Claro', icon: SunMedium },
  { value: 'dark', label: 'Escuro', icon: MoonStar },
];

export default function ThemeSelector({ compact = false, label = 'Tema' }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={`theme-selector ${compact ? 'compact' : ''}`}>
      {!compact && <span className="theme-selector-label">{label}</span>}
      <div className="theme-selector-options" role="group" aria-label="Selecionar tema">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.value;

          return (
            <button
              key={option.value}
              type="button"
              className={`theme-selector-option ${isActive ? 'active' : ''}`}
              onClick={() => setTheme(option.value)}
              title={compact ? option.label : undefined}
              aria-pressed={isActive}
            >
              <Icon size={16} />
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
      {compact && (
        <span className="theme-selector-state" aria-live="polite">
          {theme === 'dark' ? 'Escuro' : 'Claro'}
        </span>
      )}
    </div>
  );
}
