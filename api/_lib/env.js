// La web real (producción) guarda todo en la raíz del almacenamiento.
// Las versiones de prueba (rama dev, compu local) guardan todo dentro de "preview/",
// así probar algo nunca cambia la web real.
export const ENV_PREFIX = process.env.VERCEL_ENV === "production" ? "" : "preview/";

export const blobPath = (p) => `${ENV_PREFIX}${p}`;
