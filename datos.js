// Página pública para corregir datos con alerta. El código del enlace va después del # y se envía solo a la función
// de Supabase. Lo que la persona escribe queda como propuesta: la ficha no cambia hasta que AMAGRO la acepta.
// Cada dato se revisa aquí mismo (con las mismas reglas que la ficha) antes de poder enviarse.
(function () {
  const $ = id => document.getElementById(id);
  const CFG = window.AMAGRO;
  const V = window.AmagroValidar;
  const token = decodeURIComponent((location.hash || '').replace(/^#/, '')).trim();

  // Cómo se pide cada dato y con qué regla se revisa.
  const DEFINICION = {
    rut: { titulo: 'RUT', ayuda: 'Completo, con guion y dígito verificador. Por ejemplo: 12.345.678-5', tipo: 'text', inputmode: 'text', autocomplete: 'off', revisar: v => V.rut(v) },
    nacimiento: { titulo: 'Fecha de nacimiento', ayuda: 'Elígela en el calendario (toca la fecha para cambiar el año) o escríbela como día/mes/año.', tipo: 'date', autocomplete: 'bday', revisar: v => V.fecha(v) },
    telefono: { titulo: 'Teléfono', ayuda: 'Número completo, con código de país. Por ejemplo: +56 9 1234 5678', tipo: 'tel', inputmode: 'tel', autocomplete: 'tel', revisar: v => V.telefono(v) },
    region: { titulo: 'Región donde vives', ayuda: 'Elige la región de tu domicilio.', tipo: 'select', revisar: v => V.region(v) },
    correo: { titulo: 'Correo', ayuda: 'El correo donde quieres recibir los mensajes.', tipo: 'email', inputmode: 'email', autocomplete: 'email', revisar: v => V.correo(v) },
    nombre: { titulo: 'Nombre completo', ayuda: 'Nombres y apellidos.', tipo: 'text', inputmode: 'text', autocomplete: 'name', revisar: v => V.nombre(v) },
  };
  const actuales = {}; // valor que figura hoy, para saber si cambió algo

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

  // Revisa un campo, muestra el resultado debajo y, si está bien, lo deja con el formato correcto.
  function revisarCampo(clave, { ponerFormato = true } = {}) {
    const control = $('f_' + clave), msg = $('m_' + clave);
    const r = DEFINICION[clave].revisar(control.value);
    control.setAttribute('aria-invalid', r.ok ? 'false' : 'true');
    msg.className = 'msg ' + (r.ok ? 'bien' : 'mal');
    msg.textContent = r.ok ? '✓ Correcto' : r.error;
    if (r.ok && ponerFormato && DEFINICION[clave].tipo !== 'date' && control.value !== r.valor) control.value = r.valor;
    return r;
  }

  function crearCampo(clave, actual) {
    const d = DEFINICION[clave] || { titulo: clave, ayuda: '', tipo: 'text', revisar: v => ({ ok: !!String(v).trim(), error: 'Escribe este dato.', valor: String(v).trim() }) };
    DEFINICION[clave] = d;
    const caja = document.createElement('div'); caja.className = 'campo';
    const etiqueta = document.createElement('label'); etiqueta.htmlFor = 'f_' + clave; etiqueta.textContent = d.titulo;
    const ayuda = document.createElement('p'); ayuda.className = 'ayuda'; ayuda.id = 'a_' + clave; ayuda.textContent = d.ayuda;
    const msg = document.createElement('div'); msg.className = 'msg pista'; msg.id = 'm_' + clave; msg.setAttribute('aria-live', 'polite');
    let control;
    if (d.tipo === 'select') {
      control = document.createElement('select');
      const vacio = document.createElement('option'); vacio.value = ''; vacio.textContent = '(elige tu región)'; control.appendChild(vacio);
      for (const r of V.REGIONES) { const o = document.createElement('option'); o.value = r; o.textContent = r; control.appendChild(o); }
      const r = V.region(actual); if (r.ok) control.value = r.valor;
    } else if (d.tipo === 'date') {
      control = document.createElement('input'); control.type = 'date';
      const hoy = new Date(), p = n => String(n).padStart(2, '0');
      const fmt = a => a + '-' + p(hoy.getMonth() + 1) + '-' + p(hoy.getDate());
      control.min = fmt(hoy.getFullYear() - 90); control.max = fmt(hoy.getFullYear() - 18);
      const r = V.fecha(actual);
      if (r.ok) control.value = r.iso;                       // la fecha de hoy es razonable: se deja puesta
      else if (actual) msg.textContent = 'En nuestros registros figura: ' + actual + ' (no parece correcta).';
    } else {
      control = document.createElement('input'); control.type = d.tipo; control.value = actual || '';
      if (d.inputmode) control.inputMode = d.inputmode;
      control.maxLength = 200;
    }
    if (d.autocomplete) control.autocomplete = d.autocomplete;
    control.id = 'f_' + clave; control.name = clave; control.setAttribute('aria-describedby', 'a_' + clave + ' m_' + clave);
    // Se revisa al salir del campo; si ya tenía un error, se revisa mientras escribe para que desaparezca apenas esté bien.
    control.addEventListener('blur', () => { if (control.value.trim() || control.getAttribute('aria-invalid') === 'true') revisarCampo(clave); });
    control.addEventListener('change', () => revisarCampo(clave));
    control.addEventListener('input', () => { if (control.getAttribute('aria-invalid') === 'true') revisarCampo(clave, { ponerFormato: false }); });
    caja.append(etiqueta, ayuda, control, msg);
    return caja;
  }

  $('formulario').addEventListener('submit', async e => {
    e.preventDefault();
    error('');
    const valores = {}; let primeroMalo = null, cambio = false;
    for (const clave of Object.keys(actuales)) {
      const r = revisarCampo(clave);
      if (!r.ok) { primeroMalo = primeroMalo || $('f_' + clave); continue; }
      valores[clave] = r.valor;                              // formato final: RUT con puntos, teléfono +56, fecha día/mes/año
      const antes = DEFINICION[clave].revisar(actuales[clave]);
      if (!antes.ok || antes.valor !== r.valor) cambio = true;
    }
    if (primeroMalo) { primeroMalo.focus(); return error('Revisa los datos marcados en rojo antes de enviar.'); }
    if (!cambio) return error('No cambiaste ningún dato. Si ya están correctos, avísanos respondiendo el correo que te enviamos.');
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
    for (const [clave, actual] of Object.entries(r.datos.campos || {})) { actuales[clave] = actual || ''; $('campos').appendChild(crearCampo(clave, actual)); }
    mostrar('formulario');
    const primero = $('campos').querySelector('input, select');
    if (primero) primero.focus({ preventScroll: true });
  })();
})();
