// Página pública de la carta de bienvenida. El código del enlace va después del # (nunca viaja en la dirección que recibe el
// servidor de la página) y se envía solo a la función de Supabase, que entrega la carta de esa persona. El enlace se puede
// abrir varias veces hasta que vence.
(function () {
  const $ = id => document.getElementById(id);
  const CFG = window.AMAGRO;
  const token = decodeURIComponent((location.hash || '').replace(/^#/, '')).trim();

  const mostrar = id => { for (const v of ['cargando', 'invalido', 'listo']) $(v).hidden = v !== id; };
  const invalido = texto => { if (texto) $('invalidoTexto').textContent = texto; mostrar('invalido'); };
  const error = texto => { $('error').textContent = texto || ''; $('error').hidden = !texto; };

  let url = null;

  $('descargar').addEventListener('click', () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url; a.download = 'carta-de-bienvenida-AMAGRO.pdf';
    document.body.appendChild(a); a.click(); a.remove();
  });

  (async () => {
    if (!token) return invalido();
    let r;
    try {
      r = await fetch(CFG.funcion, { method: 'POST', headers: { apikey: CFG.clave, 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'bienvenida', token }) });
    } catch { return invalido('No pudimos conectarnos. Revisa tu conexión a internet e inténtalo de nuevo.'); }
    if (!r.ok) {
      let m = null; try { m = (await r.json()).error; } catch { /* sin cuerpo */ }
      return invalido(m || 'No pudimos preparar tu carta. Inténtalo de nuevo en unos minutos.');
    }
    url = URL.createObjectURL(await r.blob());
    $('ver').href = url;
    mostrar('listo');
  })();
})();
