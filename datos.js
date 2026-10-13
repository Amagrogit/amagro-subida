// Página pública para corregir datos con alerta. El código del enlace va después del # y se envía solo a la función
// de Supabase. Lo que la persona escribe queda como propuesta: la ficha no cambia hasta que AMAGRO la acepta.
(function () {
  const $ = id => document.getElementById(id);
  const CFG = window.AMAGRO;
  const token = decodeURIComponent((location.hash || '').replace(/^#/, '')).trim();
  const REGIONES = ['ARICA - PARINACOTA', 'TARAPACÁ', 'ANTOFAGASTA', 'ATACAMA', 'COQUIMBO', 'VALPARAÍSO', 'METROPOLITANA', 'O´HIGGINS', 'MAULE', 'ÑUBLE', 'BÍO BÍO', 'ARAUCANÍA', 'LOS RÍOS', 'LOS LAGOS', 'AYSÉN', 'MAGALLANES Y ANTÁRTICA CHILENA'];
  const SIN_TILDES = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

  // Cómo se pide cada dato.
  const DEFINICION = {
    rut: { titulo: 'RUT', ayuda: 'Completo, con guion y dígito verificador. Por ejemplo: 12.345.678-5', tipo: 'text', inputmode: 'text', autocomplete: 'off' },
    nacimiento: { titulo: 'Fecha de nacimiento', ayuda: 'Día, mes y año. Por ejemplo: 15/03/1985', tipo: 'text', inputmode: 'numeric', autocomplete: 'bday' },
    telefono: { titulo: 'Teléfono', ayuda: 'Número completo, con código de país. Por ejemplo: +56 9 1234 5678', tipo: 'tel', inputmode: 'tel', autocomplete: 'tel' },
    region: { titulo: 'Región donde vives', ayuda: 'Elige la región de tu domicilio.', tipo: 'select' },
    correo: { titulo: 'Correo', ayuda: 'El correo donde quieres recibir los mensajes.', tipo: 'email', inputmode: 'email', autocomplete: 'email' },
    nombre: { titulo: 'Nombre completo', ayuda: 'Nombres y apellidos.', tipo: 'text', inputmode: 'text', autocomplete: 'name' },
  };

  const mostrar = id => { for (const v of ['cargando', 'invalido', 'formulario', 'listo']) $(v).hidden = v !== id; };
  const invalido = texto => { if (texto) $('invalidoTexto').textContent = texto; mostrar('invalido'); };
  const error = texto => { $('error').textContent = texto || ''; $('error').hidden = !texto; if (texto) $('error').scrollIntoView({ block: 'nearest' }); };

  async function llamar(cuerpo) {
    let r;
    try { r = await fetch(CFG.funcion, { method: 'POST', headers: { apikey: CFG.clave, 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }); }
    catch { return { ok: false, estado: 0, error: 'No pudimos conectarnos. Revisa tu conexión a internet e inténtalo de nuevo.' }; }
    let datos = null;
    try { datos = await r.json(); } catch { /* sin cuerpo */ }
    return { ok: r.ok, estado: r.status, error: datos && datos.error, datos };
  }

  function crearCampo(clave, actual) {
    const d = DEFINICION[clave] || { titulo: clave, ayuda: '', tipo: 'text' };
    const caja = document.createElement('div'); caja.className = 'campo';
    const etiqueta = document.createElement('label'); etiqueta.htmlFor = 'f_' + clave; etiqueta.textContent = d.titulo;
    const ayuda = document.createElement('p'); ayuda.className = 'ayuda'; ayuda.id = 'a_' + clave; ayuda.textContent = d.ayuda;
    let control;
    if (d.tipo === 'select') {
      control = document.createElement('select');
      const vacio = document.createElement('option'); vacio.value = ''; vacio.textContent = '(elige tu región)'; control.appendChild(vacio);
      for (const r of REGIONES) { const o = document.createElement('option'); o.value = r; o.textContent = r; if (SIN_TILDES(r) === SIN_TILDES(actual)) o.selected = true; control.appendChild(o); }
    } else {
      control = document.createElement('input'); control.type = d.tipo; control.value = actual || '';
      if (d.inputmode) control.inputMode = d.inputmode;
      if (d.autocomplete) control.autocomplete = d.autocomplete;
      control.maxLength = 200;
    }
    control.id = 'f_' + clave; control.name = clave; control.setAttribute('aria-describedby', 'a_' + clave);
    caja.append(etiqueta, ayuda, control);
    return caja;
  }

  $('formulario').addEventListener('submit', async e => {
    e.preventDefault();
    error('');
    const valores = {};
    for (const el of $('campos').querySelectorAll('[name]')) valores[el.name] = el.value.trim();
    $('enviar').disabled = true; $('enviar').textContent = 'Enviando…';
    try {
      const r = await llamar({ accion: 'datos_enviar', token, valores });
      if (r.ok) { history.replaceState(null, '', location.pathname); return mostrar('listo'); }
      if (r.estado === 404 || r.estado === 409) return invalido(r.error);
      error(r.error || 'No pudimos guardar tus datos. Inténtalo de nuevo.');
    } finally {
      $('enviar').disabled = false; $('enviar').textContent = 'Enviar mis datos';
    }
  });

  (async () => {
    if (!token) return invalido();
    const r = await llamar({ accion: 'datos_validar', token });
    if (!r.ok) return invalido(r.error || 'No pudimos comprobar tu enlace. Inténtalo de nuevo en unos minutos.');
    for (const [clave, actual] of Object.entries(r.datos.campos || {})) $('campos').appendChild(crearCampo(clave, actual));
    mostrar('formulario');
    const primero = $('campos').querySelector('input, select');
    if (primero) primero.focus({ preventScroll: true });
  })();
})();
