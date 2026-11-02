import { v2 as cloudinary } from 'cloudinary';

const unavailable = (message) => Object.assign(new Error(message), { status: 503 });
const reportPath = (id, index) => {
  if (!/^AV-[A-Za-z0-9-]+$/.test(id) || !Number.isInteger(index) || index < 0 || index > 2)
    throw Error('Identificador de fotografía inválido.');
  return `reports/${id}/${index}`;
};

export function cloudinaryPhotoStore(env = process.env, uploader = cloudinary.uploader) {
  const required = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'FIREBASE_PROJECT_ID'];
  for (const key of required) if (!env[key]?.trim()) throw Error(`Configura ${key} en el servidor.`);
  const cloudName = env.CLOUDINARY_CLOUD_NAME.trim();
  const project = env.FIREBASE_PROJECT_ID.trim();
  if (!/^[a-zA-Z0-9_-]+$/.test(cloudName) || !/^[a-zA-Z0-9-]+$/.test(project))
    throw Error('El nombre de Cloudinary o el proyecto Firebase no es válido.');
  const prefix = `alertavecinal/${project}/`;
  const credentials = { cloud_name: cloudName, api_key: env.CLOUDINARY_API_KEY.trim(), api_secret: env.CLOUDINARY_API_SECRET.trim() };
  const validate = (asset) => {
    if (asset?.provider !== 'cloudinary' || asset.cloud_name !== cloudName ||
        !asset.public_id?.startsWith(prefix) || !/^reports\/AV-[A-Za-z0-9-]+\/[0-2]$/.test(asset.public_id.slice(prefix.length)))
      throw Error('La fotografía no pertenece al almacenamiento configurado.');
  };
  return {
    provider: 'cloudinary',
    asset: (id, index) => ({ provider: 'cloudinary', cloud_name: cloudName, public_id: prefix + reportPath(id, index) }),
    async upload(asset, photo) {
      validate(asset);
      try {
        const result = await uploader.upload(photo, { ...credentials, public_id: asset.public_id,
          resource_type: 'image', overwrite: false, format: 'jpg', timeout: 60000 });
        const url = new URL(result.secure_url);
        if (url.protocol !== 'https:' || url.username || url.password || result.public_id !== asset.public_id)
          throw Error('Respuesta inválida del almacenamiento.');
        return url.toString();
      } catch {
        throw unavailable('No se pudo guardar la fotografía. Revisa la configuración o la cuota de Cloudinary.');
      }
    },
    async delete(asset) {
      validate(asset);
      try {
        const result = await uploader.destroy(asset.public_id, { ...credentials, resource_type: 'image', invalidate: true, timeout: 30000 });
        if (!['ok', 'not found'].includes(result.result)) throw Error('No se confirmó la eliminación.');
      } catch { throw unavailable('No se pudo eliminar la fotografía de Cloudinary.'); }
    },
  };
}

export function firebasePhotoStore(bucket, getDownloadURL) {
  const validate = (asset) => {
    if (asset?.provider !== 'firebase' || asset.bucket !== bucket.name || !/^reports\/AV-[A-Za-z0-9-]+\/[0-2]\.jpg$/.test(asset.path))
      throw Error('La fotografía no pertenece al bucket configurado.');
  };
  return {
    provider: 'firebase',
    asset: (id, index) => ({ provider: 'firebase', bucket: bucket.name, path: reportPath(id, index) + '.jpg' }),
    async upload(asset, photo) {
      validate(asset);
      const file = bucket.file(asset.path);
      const { randomUUID } = await import('node:crypto');
      await file.save(Buffer.from(photo.split(',')[1], 'base64'), { resumable: false,
        metadata: { contentType: 'image/jpeg', metadata: { firebaseStorageDownloadTokens: randomUUID() } } });
      return getDownloadURL(file);
    },
    async delete(asset) { validate(asset); await bucket.file(asset.path).delete({ ignoreNotFound: true }); },
    async deleteLegacy(id) { reportPath(id, 0); await bucket.deleteFiles({ prefix: `reports/${id}/` }); },
  };
}
