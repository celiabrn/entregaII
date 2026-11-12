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
    } catch (error) {
        console.error('Error al aplicar la internacionalización:', error);
    } finally {
        // Revelar siempre la página al terminar (evita bloqueo visual si falla fetch)
        document.documentElement.classList.remove('traduciendo');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const idiomaGuardado = localStorage.getItem('idioma_pref') || 'es';
    cambiarIdioma(idiomaGuardado);
});