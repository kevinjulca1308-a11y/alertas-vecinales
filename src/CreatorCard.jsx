import React from 'react';
import { ArrowUpRight, Code2 } from 'lucide-react';

export const creatorProfile = 'https://www.tiktok.com/@kxvn04_';
function TikTokIcon() {
  return <svg className="tiktok-symbol" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M14 2h3c.3 2.5 1.8 4.1 4 4.5v3a8.4 8.4 0 0 1-4-1.4v7.1a6.2 6.2 0 1 1-6.2-6.1v3a3.2 3.2 0 1 0 3.2 3.1V2Z" /></svg>;
}
export default function CreatorCard() {
  return <section className="creator-card" aria-label="Creador de AlertaVecinal"><div className="creator-avatar" aria-hidden="true"><TikTokIcon /><span><Code2 size={13} /></span></div><div className="creator-copy"><span className="creator-eyebrow"><i />CREADOR DE LA APP</span><h2>@kxvn04_</h2><p>¿Una idea para AlertaVecinal? Compártela con su creador.</p></div><a className="creator-link" href={creatorProfile} target="_blank" rel="noopener noreferrer" aria-label="Contactar al creador @kxvn04_ en TikTok"><TikTokIcon /><span><small>CONECTEMOS</small>Visitar mi TikTok</span><ArrowUpRight size={20} /></a></section>;
}
export function CreatorCredit() {
  return <a className="creator-credit" href={creatorProfile} target="_blank" rel="noopener noreferrer" aria-label="Contactar al creador @kxvn04_ en TikTok"><TikTokIcon /><span>Creada por <strong>@kxvn04_</strong></span><ArrowUpRight size={13} /></a>;
}
