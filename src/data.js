export const categories = ['Alumbrado', 'Limpieza', 'Vías públicas', 'Áreas verdes', 'Otros'];
export const statuses = ['Reportado', 'En proceso', 'Resuelto'];
export const photos = {
 'Alumbrado': 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=800&auto=format&fit=crop',
 'Limpieza': 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800&auto=format&fit=crop',
 'Vías públicas': 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=800&auto=format&fit=crop',
 'Áreas verdes': 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=800&auto=format&fit=crop',
 'Otros': 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&auto=format&fit=crop'
};
export const seedReports = [
 {id:'AV-1048',title:'Alumbrado sin funcionar en Av. Arequipa',category:'Alumbrado',status:'Reportado',address:'Av. Arequipa, cuadra 45 · Miraflores',description:'Tres postes de luz no encienden por las noches. La zona queda oscura y dificulta el paso de los vecinos.',lat:-12.111,lng:-77.031,photo:photos.Alumbrado,votes:24,date:'2026-10-12T14:30:00Z',author:'María G.',demo:true,history:[{status:'Reportado',date:'2026-10-12T14:30:00Z'}]},
 {id:'AV-1047',title:'Residuos acumulados cerca del mercado',category:'Limpieza',status:'En proceso',address:'Calle José Gálvez, cuadra 3 · Miraflores',description:'Hay bolsas y residuos en la esquina. Se necesita limpieza y un punto de recolección adecuado.',lat:-12.118,lng:-77.038,photo:photos.Limpieza,votes:18,date:'2026-10-11T13:00:00Z',author:'Carlos R.',demo:true,history:[{status:'Reportado',date:'2026-10-11T13:00:00Z'},{status:'En proceso',date:'2026-10-12T09:00:00Z'}]},
 {id:'AV-1046',title:'Bache en la intersección de dos calles',category:'Vías públicas',status:'Reportado',address:'Av. Pardo con Calle Bolognesi · Miraflores',description:'Un bache profundo representa un riesgo para ciclistas y vehículos. Se solicita reparación.',lat:-12.115,lng:-77.035,photo:photos['Vías públicas'],votes:32,date:'2026-10-10T18:00:00Z',author:'Lucía P.',demo:true,history:[{status:'Reportado',date:'2026-10-10T18:00:00Z'}]},
 {id:'AV-1045',title:'Recuperación de las áreas verdes del parque',category:'Áreas verdes',status:'Resuelto',address:'Parque Kennedy · Miraflores',description:'Se completó el mantenimiento de los jardines y la recuperación de las áreas verdes reportadas.',lat:-12.121,lng:-77.029,photo:photos['Áreas verdes'],votes:15,date:'2026-10-09T10:00:00Z',author:'Diego M.',demo:true,history:[{status:'Reportado',date:'2026-10-09T10:00:00Z'},{status:'En proceso',date:'2026-10-10T10:00:00Z'},{status:'Resuelto',date:'2026-10-11T16:00:00Z'}]},
 {id:'AV-1044',title:'Luminaria dañada en el malecón',category:'Alumbrado',status:'En proceso',address:'Malecón de la Reserva · Miraflores',description:'La luminaria presenta daños y requiere mantenimiento para mejorar la seguridad del paseo.',lat:-12.127,lng:-77.036,photo:photos.Alumbrado,votes:11,date:'2026-10-08T12:00:00Z',author:'Andrea S.',demo:true,history:[{status:'Reportado',date:'2026-10-08T12:00:00Z'},{status:'En proceso',date:'2026-10-09T12:00:00Z'}]},
 {id:'AV-1043',title:'Mantenimiento de la vereda finalizado',category:'Vías públicas',status:'Resuelto',address:'Calle Lima, cuadra 5 · Miraflores',description:'La vereda ha sido reparada y ya es accesible para las personas que transitan por esta calle.',lat:-12.116,lng:-77.025,photo:photos['Vías públicas'],votes:9,date:'2026-10-07T10:00:00Z',author:'José V.',demo:true,history:[{status:'Reportado',date:'2026-10-07T10:00:00Z'},{status:'En proceso',date:'2026-10-08T10:00:00Z'},{status:'Resuelto',date:'2026-10-10T10:00:00Z'}]}
];
export function filterReports(reports,{search='',category='Todas',status='Todos',mine=false,sort='recent'}={}) {
 const q=search.toLocaleLowerCase('es');
 return reports.filter(r=>(!mine||!r.demo)&&(category==='Todas'||r.category===category)&&(status==='Todos'||r.status===status)&&`${r.title} ${r.address} ${r.id}`.toLocaleLowerCase('es').includes(q)).sort((a,b)=>sort==='popular'?b.votes-a.votes:new Date(b.date)-new Date(a.date));
}
export function createReport(values, now=new Date()) {
 if(!values.title.trim()||!values.description.trim()||!values.address.trim()) throw new Error('Completa los campos obligatorios.');
 if(!categories.includes(values.category)) throw new Error('Selecciona una categoría válida.');
 if(!Number.isFinite(values.lat)||!Number.isFinite(values.lng)||Math.abs(values.lat)>90||Math.abs(values.lng)>180) throw new Error('Selecciona una ubicación válida en el mapa.');
 return {...values,title:values.title.trim(),address:values.address.trim(),description:values.description.trim(),id:`AV-${now.getTime().toString(36).toUpperCase()}`,status:'Reportado',votes:0,date:now.toISOString(),author:'Tú',demo:false,history:[{status:'Reportado',date:now.toISOString()}]};
}
