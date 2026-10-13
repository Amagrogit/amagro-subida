// Comprobaciones de la página de corrección de datos. Son las MISMAS reglas que usa la ficha de la app
// (lib/normalizar.js), para avisar a la persona de un error antes de que lo envíe.
// Sirve en el navegador (window.AmagroValidar) y en las pruebas de Node (require).
(function (raiz) {
  const REGIONES = ['ARICA - PARINACOTA', 'TARAPACÁ', 'ANTOFAGASTA', 'ATACAMA', 'COQUIMBO', 'VALPARAÍSO', 'METROPOLITANA', 'O´HIGGINS', 'MAULE', 'ÑUBLE', 'BÍO BÍO', 'ARAUCANÍA', 'LOS RÍOS', 'LOS LAGOS', 'AYSÉN', 'MAGALLANES Y ANTÁRTICA CHILENA'];
  const sinTildes = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const p2 = n => String(n).padStart(2, '0');

  // RUT chileno: dígito verificador (módulo 11).
  function rut(valor) {
    const limpio = String(valor ?? '').replace(/[^0-9kK]/g, '').toUpperCase();
    if (!limpio) return { ok: false, error: 'Escribe tu RUT.' };
    if (limpio.length < 8) return { ok: false, error: 'El RUT parece incompleto. Escríbelo completo, con dígito verificador.' };
    const cuerpo = limpio.slice(0, -1), dv = limpio.slice(-1);
    if (!/^\d+$/.test(cuerpo)) return { ok: false, error: 'El RUT solo lleva números, un guion y el dígito verificador.' };
    let suma = 0, mult = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) { suma += Number(cuerpo[i]) * mult; mult = mult === 7 ? 2 : mult + 1; }
    const resto = 11 - (suma % 11);
    const esperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
    if (esperado !== dv) return { ok: false, error: 'Revisa tu RUT: el dígito verificador no corresponde.' };
    return { ok: true, valor: cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv };
  }

  // Celular o teléfono de 9 dígitos (con o sin +56).
  function telefono(valor) {
    let n = String(valor ?? '').replace(/\D/g, '');
    if (!n) return { ok: false, error: 'Escribe tu teléfono.' };
    if (n.startsWith('56') && n.length >= 11) n = n.slice(2);
    if (n.length !== 9) return { ok: false, error: 'El teléfono debe tener 9 dígitos, por ejemplo +56 9 1234 5678.' };
    return { ok: true, valor: `+56 ${n[0]} ${n.slice(1, 5)} ${n.slice(5)}` };
  }

  // Fecha como aaaa-mm-dd (del calendario) o día/mes/año (escrita). Entre 18 y 90 años.
  function fecha(valor, hoy = new Date()) {
    const s = String(valor ?? '').trim();
    if (!s) return { ok: false, error: 'Elige tu fecha de nacimiento.' };
    let a, m, d, r;
    if ((r = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) { a = +r[1]; m = +r[2]; d = +r[3]; }
    else if ((r = s.match(/^(\d{1,2})\s*[\/\-. ]\s*(\d{1,2})\s*[\/\-. ]\s*(\d{4})$/))) { d = +r[1]; m = +r[2]; a = +r[3]; }
    else return { ok: false, error: 'No entendimos la fecha. Elígela en el calendario o escríbela como día/mes/año.' };
    const f = new Date(Date.UTC(a, m - 1, d));
    if (f.getUTCFullYear() !== a || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) return { ok: false, error: 'Esa fecha no existe. Revisa el día y el mes.' };
    let edad = hoy.getFullYear() - a;
    if (hoy.getMonth() + 1 < m || (hoy.getMonth() + 1 === m && hoy.getDate() < d)) edad--;
    if (edad < 18 || edad > 90) return { ok: false, error: 'La fecha no parece correcta (edad de ' + edad + ' años). Revisa el año.' };
    return { ok: true, valor: `${p2(d)}/${p2(m)}/${a}`, iso: `${a}-${p2(m)}-${p2(d)}` };
  }

  function region(valor, lista = REGIONES) {
    const s = String(valor ?? '').trim();
    if (!s) return { ok: false, error: 'Elige tu región.' };
    const r = lista.find(x => sinTildes(x).toLowerCase() === sinTildes(s).toLowerCase());
    return r ? { ok: true, valor: r } : { ok: false, error: 'Elige tu región de la lista.' };
  }

  function correo(valor) {
    const s = String(valor ?? '').trim().toLowerCase();
    if (!s) return { ok: false, error: 'Escribe tu correo.' };
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? { ok: true, valor: s } : { ok: false, error: 'El correo no parece válido. Revisa que tenga @ y un dominio, por ejemplo nombre@correo.cl.' };
  }

  function nombre(valor) {
    const s = String(valor ?? '').trim().replace(/\s+/g, ' ');
    if (!s) return { ok: false, error: 'Escribe tu nombre completo.' };
    return s.split(' ').length >= 2 ? { ok: true, valor: s } : { ok: false, error: 'Escribe tu nombre y tus apellidos.' };
  }

  const api = { rut, telefono, fecha, region, correo, nombre, REGIONES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.AmagroValidar = api;
})(typeof window !== 'undefined' ? window : globalThis);
