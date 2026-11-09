import React, { useEffect, useState } from 'react';
import { Check, Moon, Sun, Monitor, Palette, Sparkles, Type, Waves, RotateCcw } from 'lucide-react';

const choices = {
  theme: ['dark', 'light', 'system'], background: ['gradient', 'plain'],
  accent: ['ocean', 'aurora', 'forest'], text: ['normal', 'large'], motion: ['system', 'reduced'],
};
const defaults = { theme: 'dark', background: 'gradient', accent: 'ocean', text: 'normal', motion: 'system' };
function read(key) {
  try { const saved = localStorage.getItem(`av-${key}`); return choices[key].includes(saved) ? saved : defaults[key]; }
  catch { return defaults[key]; }
}
export function useAppearance() {
  const [theme, setTheme] = useState(() => read('theme'));
  const [background, setBackground] = useState(() => read('background'));
  const [accent, setAccent] = useState(() => read('accent'));
  const [text, setText] = useState(() => read('text'));
  const [motion, setMotion] = useState(() => read('motion'));
  useEffect(() => {
    for (const [key, value] of Object.entries({ background, accent, text, motion })) {
      document.documentElement.dataset[key] = value;
      try { localStorage.setItem(`av-${key}`, value); } catch {}
    }
  }, [background, accent, text, motion]);
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const effective = theme === 'system' ? media.matches ? 'dark' : 'light' : theme;
      document.documentElement.dataset.theme = effective;
      document.documentElement.style.colorScheme = effective;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', effective === 'dark' ? '#080f1d' : '#f3f6fc');
    };
    apply();
    try { localStorage.setItem('av-theme', theme); } catch {}
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
  const reset = () => { setTheme('dark'); setBackground('gradient'); setAccent('ocean'); setText('normal'); setMotion('system'); };
  return { theme, setTheme, background, setBackground, accent, setAccent, text, setText, motion, setMotion, reset };
}
export function ThemePicker({ theme, setTheme }) {
  const Icon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  return <label className="theme-picker"><Icon size={17} /><select aria-label="Tema de la aplicación" value={theme} onChange={(e) => setTheme(e.target.value)}><option value="system">Automático</option><option value="light">Claro</option><option value="dark">Oscuro</option></select></label>;
}
export default function AppearancePanel({ appearance }) {
  const { theme, setTheme, background, setBackground, accent, setAccent, text, setText, motion, setMotion, reset } = appearance;
  return <div className="appearance-panel">
    <div className="appearance-heading"><span className="feature-icon"><Palette size={23} /></span><span className="eyebrow">A TU MANERA</span><h2>Hazla tuya.</h2><p>Tu comunidad, con tu estilo. Los cambios se guardan en este dispositivo.</p></div>
    <fieldset className="appearance-section"><legend><Moon size={16} />Apariencia</legend><div className="theme-options">{[['dark', 'Noche', Moon], ['light', 'Día', Sun], ['system', 'Automático', Monitor]].map(([value, label, Icon]) => <button key={value} type="button" aria-pressed={theme === value} onClick={() => setTheme(value)}><span className={`theme-preview ${value}`}><i /><i /><i /></span><span><Icon size={15} />{label}{theme === value && <Check size={15} />}</span></button>)}</div></fieldset>
    <fieldset className="appearance-section"><legend><Palette size={16} />Color de acento</legend><div className="accent-options">{[['ocean', 'Océano', 'Azul y turquesa'], ['aurora', 'Aurora', 'Violeta y rosa'], ['forest', 'Bosque', 'Verde y esmeralda']].map(([value, label, hint]) => <button key={value} type="button" aria-pressed={accent === value} onClick={() => setAccent(value)}><span className={`accent-swatch ${value}`}>{accent === value && <Check size={17} />}</span><strong>{label}</strong><small>{hint}</small></button>)}</div></fieldset>
    <div className="appearance-row"><div><strong><Sparkles size={16} />Fondo de la aplicación</strong><p>Un toque de luz o un acabado liso.</p></div><div className="background-picker" role="group" aria-label="Fondo de la aplicación">{[['gradient', 'Degradado'], ['plain', 'Liso']].map(([value, label]) => <button key={value} type="button" aria-pressed={background === value} onClick={() => setBackground(value)}><span className={`background-swatch ${value}`} />{label}</button>)}</div></div>
    <label className="appearance-row"><div><strong><Type size={16} />Tamaño de lectura</strong><p>Más comodidad al leer los reportes.</p></div><select aria-label="Tamaño de lectura" value={text} onChange={(e) => setText(e.target.value)}><option value="normal">Normal</option><option value="large">Grande</option></select></label>
    <label className="appearance-row"><div><strong><Waves size={16} />Movimiento</strong><p>Respeta la preferencia de tu teléfono.</p></div><select aria-label="Movimiento de la interfaz" value={motion} onChange={(e) => setMotion(e.target.value)}><option value="system">Automático</option><option value="reduced">Reducido</option></select></label>
    <button type="button" className="text-button reset-appearance" onClick={reset}><RotateCcw size={15} />Restablecer diseño</button>
  </div>;
}
