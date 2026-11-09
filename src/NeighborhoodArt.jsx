import React from 'react';

export default function NeighborhoodArt() {
  return <div className="neighborhood-art" aria-hidden="true"><svg viewBox="0 0 440 260" fill="none">
    <defs><linearGradient id="district-line" x1="60" y1="220" x2="380" y2="20" gradientUnits="userSpaceOnUse"><stop stopColor="var(--primary)" /><stop offset="1" stopColor="var(--accent-end)" /></linearGradient><pattern id="district-grid" width="25" height="25" patternUnits="userSpaceOnUse"><path d="M25 0H0V25" stroke="currentColor" strokeOpacity=".07" /></pattern></defs>
    <rect width="440" height="260" fill="url(#district-grid)" />
    <g transform="translate(220 130) scale(1 .57) rotate(-30)"><rect x="-150" y="-150" width="300" height="300" rx="55" stroke="currentColor" strokeOpacity=".09" fill="currentColor" fillOpacity=".025" /><path d="M-150 -55H150M-150 55H150M-55 -150V150M55 -150V150" stroke="currentColor" strokeOpacity=".1" strokeWidth="14" /><path d="M-150 55H55V-150" stroke="url(#district-line)" strokeWidth="3" strokeDasharray="7 7" />
    {[[-128,-125],[-30,-125],[82,-125],[-128,-27],[82,-27],[-128,83],[-27,83],[82,83]].map(([x,y],i)=><g key={i}><rect x={x} y={y} width="48" height="44" rx="8" stroke="url(#district-line)" strokeOpacity=".35" fill="currentColor" fillOpacity=".04" /><path d={`M${x+10} ${y+30}V${y+19}l14-10 14 10v11H${x+10}Z`} stroke="currentColor" strokeOpacity=".3" strokeWidth="2" /></g>)}
    </g>
    <circle cx="220" cy="122" r="67" stroke="url(#district-line)" strokeOpacity=".15" /><circle cx="220" cy="122" r="91" stroke="url(#district-line)" strokeOpacity=".08" />
    <circle cx="127" cy="175" r="7" fill="var(--accent-end)" /><circle cx="127" cy="175" r="14" stroke="var(--accent-end)" strokeOpacity=".2" />
    <circle cx="331" cy="73" r="5" fill="var(--primary-text)" /><circle cx="331" cy="73" r="12" stroke="var(--primary-text)" strokeOpacity=".25" />
  </svg><div className="neighborhood-logo"><img src="/logo.png" alt="" width="70" height="70" /></div><span className="district-tag"><i />Guadalupe conectada</span></div>;
}
