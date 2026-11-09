// Official directories checked on 2026-11-09. Keep phone links local so Android
// can open the dialer even when the API is unavailable. No calls are automatic.
export const nationalSource = 'https://www.gob.pe/547-telefonos-de-emergencia';
export const localSource = 'https://www.gob.pe/institucion/muniguadalupe/contacto-y-numeros-de-emergencias';
export const emergencyContacts = [
  { id: 'police', name: 'Policía Nacional', number: '105', dial: '105', description: 'Delitos y peligro inmediato', icon: 'shield', tone: 'blue', source: nationalSource },
  { id: 'fire', name: 'Bomberos', number: '116', dial: '116', description: 'Incendios, accidentes y rescates', icon: 'flame', tone: 'coral', source: nationalSource },
  { id: 'medical', name: 'SAMU', number: '106', dial: '106', description: 'Urgencias y emergencias médicas', icon: 'medical', tone: 'green', source: nationalSource },
  { id: 'serenazgo', name: 'Serenazgo de Guadalupe', number: '941 337 924', dial: '+51941337924', description: 'Seguridad ciudadana en tu distrito', icon: 'shield', tone: 'purple', source: localSource },
  { id: 'station', name: 'Comisaría de Guadalupe', number: '044 566 806', dial: '+5144566806', description: 'Contacto con la comisaría local', icon: 'shield', tone: 'blue', source: localSource },
  { id: 'violence', name: 'Línea 100', number: '100', dial: '100', description: 'Orientación ante violencia familiar y sexual', icon: 'heart', tone: 'purple', source: nationalSource },
];
