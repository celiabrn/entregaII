const cacheTraducciones = {};
const idiomasSoportados = ['es', 'en'];

async function cargarDiccionario(idioma) {
    if (cacheTraducciones[idioma]) {
        return cacheTraducciones[idioma];
    }

    const respuesta = await fetch(`js/i18n/${idioma}.json`);
    if (!respuesta.ok) {
        throw new Error(`No se pudo cargar el archivo de idioma: ${idioma}.json`);
    }

    const datos = await respuesta.json();
    cacheTraducciones[idioma] = datos;
    return datos;
}

async function cambiarIdioma(idioma) {
    const idiomaValido = idiomasSoportados.includes(idioma) ? idioma : 'es';

    localStorage.setItem('idioma_pref', idiomaValido);
    document.documentElement.lang = idiomaValido;

    // Sincronizar el desplegable semántico de la cabecera sin depender de IDs
    const selectIdioma = document.querySelector('body > header select');
    if (selectIdioma) {
        selectIdioma.value = idiomaValido;
    }

    try {
        const diccionario = await cargarDiccionario(idiomaValido);

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const clave = el.getAttribute('data-i18n');
            if (diccionario[clave]) {
                if (el.tagName === 'INPUT' && el.hasAttribute('placeholder')) {
                    el.placeholder = diccionario[clave];
                } else {
                    el.innerHTML = diccionario[clave];
                }
            }
        });

        // Actualizar títulos accesibles
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const clave = el.getAttribute('data-i18n-title');
            if (diccionario[clave]) {
                el.title = diccionario[clave];
            }
        });

        // Actualizar textos alternativos de imágenes y etiquetas accesibles (aria-label)
        const atributosTraducibles = [
            ['data-i18n-alt', 'alt'],
            ['data-i18n-aria-label', 'aria-label']
        ];
        atributosTraducibles.forEach(([atributoClave, atributoDestino]) => {
            document.querySelectorAll(`[${atributoClave}]`).forEach(el => {
                const clave = el.getAttribute(atributoClave);
                if (diccionario[clave]) {
                    el.setAttribute(atributoDestino, diccionario[clave]);
                }
            });
        });

        // Actualizar subtítulos de vídeos
        document.querySelectorAll('video').forEach(video => {
            const pistas = video.textTracks;
            for (let i = 0; i < pistas.length; i++) {
                pistas[i].mode = (pistas[i].language === idioma) ? 'showing' : 'disabled';
            }
        });

        // Notificar cambio de idioma a otros módulos
        window.dispatchEvent(new CustomEvent('idiomacambiado', { detail: { idioma: idiomaValido } }));
    } catch (error) {
        console.error('Error al aplicar la internacionalización:', error);
    } finally {
        // Revelar siempre la página al terminar (evita bloqueo visual si falla fetch)
        document.documentElement.classList.remove('traduciendo');
    }
}

// Exponer para otros módulos como el buscador
window.cacheTraducciones = cacheTraducciones;
window.cargarDiccionario = cargarDiccionario;
window.cambiarIdioma = cambiarIdioma;

document.addEventListener('DOMContentLoaded', () => {
    const idiomaGuardado = localStorage.getItem('idioma_pref') || 'es';
    cambiarIdioma(idiomaGuardado);
});
