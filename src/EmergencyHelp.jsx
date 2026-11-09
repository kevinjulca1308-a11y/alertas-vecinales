import React from 'react';
import { Phone, ShieldCheck, Flame, HeartPulse, HeartHandshake, ArrowUpRight, MapPin, ExternalLink, ArrowRight } from 'lucide-react';
import { emergencyContacts, localSource, nationalSource } from './emergency-contacts';

const icons = { shield: ShieldCheck, flame: Flame, medical: HeartPulse, heart: HeartHandshake };
export function EmergencyStrip({ onOpen }) {
  return <section className="emergency-strip" aria-label="Ayuda inmediata"><div className="emergency-strip-label"><span className="emergency-symbol"><Phone size={19} /></span><div><strong>Ayuda a una llamada</strong><span>Si hay peligro, llama primero.</span></div></div><div className="emergency-quick-links">{emergencyContacts.slice(0, 3).map((contact) => <a key={contact.id} href={`tel:${contact.dial}`} aria-label={`Llamar a ${contact.name} al ${contact.number}`}><strong>{contact.number}</strong><span>{contact.id === 'police' ? 'Policía' : contact.name}</span><ArrowUpRight size={15} /></a>)}</div><button className="text-button" onClick={onOpen}>Ver contactos<ArrowRight size={16} /></button></section>;
}
export default function EmergencyHelp() {
  return <div className="emergency-help"><span className="feature-icon emergency-symbol"><Phone size={24} /></span><span className="eyebrow">AYUDA INMEDIATA</span><h2>Conecta con quien<br />puede ayudarte.</h2><p>Elige un servicio para abrir el marcador de tu teléfono. Si existe peligro inmediato, llama antes de crear un reporte.</p>
    <div className="emergency-locality"><MapPin size={15} />Guadalupe · Pacasmayo · La Libertad</div>
    <h3>Emergencias nacionales</h3><div className="emergency-cards">{emergencyContacts.slice(0, 3).map((contact) => <Contact key={contact.id} contact={contact} />)}</div>
    <h3>Cerca de ti y otras líneas de ayuda</h3><div className="emergency-cards secondary-contacts">{emergencyContacts.slice(3).map((contact) => <Contact key={contact.id} contact={contact} />)}</div>
    <div className="emergency-footnote"><ShieldCheck size={18} /><p>Las llamadas se realizan desde tu teléfono. Publicar en AlertaVecinal no envía una alerta automática a las autoridades.</p></div>
    <div className="emergency-sources"><span>Directorio consultado el 9 nov. 2026</span><a href={localSource} target="_blank" rel="noopener noreferrer">Municipalidad de Guadalupe<ExternalLink size={12} /></a><a href={nationalSource} target="_blank" rel="noopener noreferrer">Emergencias del Perú<ExternalLink size={12} /></a></div>
  </div>;
}
function Contact({ contact }) {
  const Icon = icons[contact.icon];
  return <a className={`emergency-contact ${contact.tone}`} href={`tel:${contact.dial}`} aria-label={`Llamar a ${contact.name} al ${contact.number}`}><span className={`category-icon ${contact.tone}`}><Icon size={22} /></span><span className="emergency-contact-name">{contact.name}</span><strong>{contact.number}</strong><span className="emergency-description">{contact.description}</span><span className="emergency-call"><Phone size={15} />Llamar<ArrowUpRight size={15} /></span></a>;
}
