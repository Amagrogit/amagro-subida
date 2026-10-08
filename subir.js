// Página pública de envío de documentos. El código del enlace va después del # (nunca viaja en la dirección que
// recibe el servidor de la página) y se envía solo a la función de Supabase, junto con los archivos.
(function () {
  const MAX = 6 * 1024 * 1024;
  const $ = id => document.getElementById(id);
  const CFG = window.AMAGRO;
  const token = decodeURIComponent((location.hash || '').replace(/^#/, '')).trim();

  const mostrar = id => { for (const v of ['cargando', 'invalido', 'formulario', 'listo']) $(v).hidden = v !== id; };
  const invalido = texto => { if (texto) $('invalidoTexto').textContent = texto; mostrar('invalido'); };
  const error = texto => { $('error').textContent = texto || ''; $('error').hidden = !texto; if (texto) $('error').scrollIntoView({ block: 'nearest' }); };
  const mb = n => (n / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';

  async function llamar(cuerpo, esJson) {
    let r;
    try {
      r = await fetch(CFG.funcion, { method: 'POST', headers: { apikey: CFG.clave, ...(esJson ? { 'Content-Type': 'application/json' } : {}) }, body: esJson ? JSON.stringify(cuerpo) : cuerpo });
    } catch { return { ok: false, estado: 0, error: 'No pudimos conectarnos. Revisa tu conexión a internet e inténtalo de nuevo.' }; }
    let datos = null;
    try { datos = await r.json(); } catch { /* sin cuerpo */ }
    return { ok: r.ok, estado: r.status, error: datos && datos.error };
  }

  // PDF: se envía tal cual. Imagen: se reduce y se guarda como JPG para que quepa en el límite y se suba rápido.
  async function cargarImagen(archivo) {
    if (window.createImageBitmap) {
      try { return await createImageBitmap(archivo, { imageOrientation: 'from-image' }); } catch { /* se prueba con <img> */ }
    }
    return await new Promise((ok, fail) => {
      const url = URL.createObjectURL(archivo), img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); ok(img); };
      img.onerror = () => { URL.revokeObjectURL(url); fail(new Error('imagen')); };
      img.src = url;
    });
  }
  function aBlob(canvas, calidad) { return new Promise(ok => canvas.toBlob(ok, 'image/jpeg', calidad)); }

  async function preparar(archivo, nombre) {
    if (archivo.type === 'application/pdf' || /\.pdf$/i.test(archivo.name)) {
      if (archivo.size > MAX) throw new Error('El PDF de ' + nombre + ' pesa ' + mb(archivo.size) + ' y el máximo es 6 MB.');
      return archivo;
    }
    if (!/^image\//.test(archivo.type)) throw new Error('El archivo de ' + nombre + ' debe ser un PDF o una foto.');
    let img;
    try { img = await cargarImagen(archivo); } catch { throw new Error('No pudimos leer la imagen de ' + nombre + '. Prueba con otra foto o con un PDF.'); }
    for (const [lado, calidad] of [[2400, 0.85], [1800, 0.75], [1400, 0.7]]) {
      const w0 = img.width || img.naturalWidth, h0 = img.height || img.naturalHeight;
      const escala = Math.min(1, lado / Math.max(w0, h0));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w0 * escala)); c.height = Math.max(1, Math.round(h0 * escala));
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); // las partes transparentes quedan blancas
      g.drawImage(img, 0, 0, c.width, c.height);
      const blob = await aBlob(c, calidad);
      if (blob && blob.size <= MAX) return new File([blob], 'documento.jpg', { type: 'image/jpeg' });
    }
    throw new Error('La imagen de ' + nombre + ' es demasiado pesada. Prueba con una foto de menor calidad o con un PDF.');
  }

  for (const campo of ['carta', 'carnet']) {
    $(campo).addEventListener('change', () => {
      const f = $(campo).files[0];
      $(campo + 'Elegido').textContent = f ? '✔ ' + f.name + ' (' + mb(f.size) + ')' : '';
      error('');
    });
  }

  $('formulario').addEventListener('submit', async e => {
    e.preventDefault();
    error('');
    const carta = $('carta').files[0], carnet = $('carnet').files[0];
    if (!carta) return error('Falta elegir la carta firmada.');
    if (!carnet) return error('Falta elegir la copia del carnet.');
    $('enviar').disabled = true; $('enviar').textContent = 'Enviando…';
    try {
      const [c1, c2] = [await preparar(carta, 'la carta firmada'), await preparar(carnet, 'la copia del carnet')];
      const fd = new FormData();
      fd.set('accion', 'subir'); fd.set('token', token);
      fd.set('carta', c1, c1.name); fd.set('carnet', c2, c2.name);
      const r = await llamar(fd, false);
      if (r.ok) { history.replaceState(null, '', location.pathname); return mostrar('listo'); }
      if (r.estado === 404 || r.estado === 409) return invalido(r.error);
      error(r.error || 'No pudimos guardar tus archivos. Inténtalo de nuevo.');
    } catch (err) {
      error(err.message);
    } finally {
      $('enviar').disabled = false; $('enviar').textContent = 'Enviar documentos';
    }
  });

  (async () => {
    if (!token) return invalido();
    const r = await llamar({ accion: 'validar', token }, true);
    if (r.ok) return mostrar('formulario');
    if (r.estado === 404) return invalido(r.error);
    invalido(r.error || 'No pudimos comprobar tu enlace. Inténtalo de nuevo en unos minutos.');
  })();
})();
