/**
 * Buscador dinámico de contenidos del sitio web basado en el diccionario i18n
 * - Carga los mapeos de secciones y las sugerencias desde archivos JSON externos (js/i18n/buscador-{idioma}.json).
 * - Los textos de la interfaz se leen del diccionario i18n (claves search.* de js/i18n/{idioma}.json).
 * - Libre de <div> y clases CSS genéricas.
 * - Genera fragmentos contextuales dinámicos con resaltado <mark>.
 * - Soporte bilingüe y navegación por teclado (WCAG).
 */
(function() {
    'use strict';

    // Caché de los archivos de mapeo ya descargados, por idioma (evita repetir peticiones)
    const cacheConfiguracion = {};

    /**
     * Devuelve el idioma activo: el guardado por el usuario o, si no hay, el del documento.
     * @returns {string} Código de idioma ("es" o "en").
     */
    function obtenerIdiomaActual() {
        return localStorage.getItem('idioma_pref') || document.documentElement.lang || 'es';
    }

    /**
     * Pasa el texto a minúsculas y le quita las tildes para comparar sin distinguirlas
     * (así "botanico" encuentra "Botánico").
     * @param {string} texto
     * @returns {string} Texto normalizado.
     */
    function normalizarTexto(texto) {
        return (texto || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    /**
     * Elimina las etiquetas HTML (algunos textos del diccionario contienen enlaces)
     * y deja un solo espacio entre palabras.
     * @param {string} textoConHtml
     * @returns {string} Texto plano.
     */
    function limpiarHtml(textoConHtml) {
        return (textoConHtml || '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Convierte los caracteres especiales en entidades HTML antes de insertarlos en la página.
     * Evita que lo que escribe el usuario se interprete como HTML o JavaScript (XSS).
     * @param {string} texto
     * @returns {string} Texto seguro para insertar con innerHTML.
     */
    function escaparHtml(texto) {
        return (texto || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Indica si una clave del diccionario es contenido que se debe buscar.
     * Se descartan los textos comunes a todas las páginas (cabecera, pie, idioma),
     * los del propio buscador, botones, títulos de pestaña, títulos de tablas,
     * textos alternativos de imágenes, etiquetas aria-label y atributos title.
     * @param {string} clave Clave del diccionario (ej. "hobbies.botany.p1").
     * @returns {boolean}
     */
    function esClaveContenido(clave) {
        return !clave.startsWith('skip.') &&
               !clave.startsWith('lang.') &&
               !clave.startsWith('header.') &&
               !clave.startsWith('footer.') &&
               !clave.startsWith('404.') &&
               !clave.startsWith('search.') &&
               !clave.startsWith('alt.') &&
               !clave.startsWith('aria.') &&
               !clave.startsWith('title.') &&
               !clave.endsWith('.btn') &&
               !clave.endsWith('.meta.title') &&
               !clave.endsWith('.caption');
    }

    /**
     * Carga el archivo de mapeo del buscador (secciones y sugerencias) del idioma indicado.
     * Lo guarda en caché y, si falla un idioma distinto del español, usa el de español.
     * @param {string} idioma
     * @returns {Promise<Object>} Objeto con "secciones" y "sugerencias".
     */
    async function obtenerConfiguracionBuscador(idioma) {
        if (cacheConfiguracion[idioma]) {
            return cacheConfiguracion[idioma];
        }
        try {
            const resp = await fetch(`js/i18n/buscador-${idioma}.json`);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();
            cacheConfiguracion[idioma] = data;
            return data;
        } catch (err) {
            if (idioma !== 'es') {
                return obtenerConfiguracionBuscador('es');
            }
            throw err;
        }
    }

    /**
     * Busca la sección a la que pertenece una clave comparando su prefijo.
     * Devuelve la PRIMERA coincidencia, por eso en el JSON los prefijos concretos
     * (ej. "hobbies.botany") van antes que los generales (ej. "hobbies").
     * @param {string} clave
     * @param {Array} secciones Lista de secciones del archivo de mapeo.
     * @returns {{url: string, categoria: string, titulo: string}|null}
     */
    function obtenerSeccionParaClave(clave, secciones) {
        for (const sec of secciones) {
            if (clave === sec.prefijo || clave.startsWith(sec.prefijo + '.')) {
                return {
                    url: sec.url,
                    categoria: sec.categoria,
                    titulo: sec.titulo
                };
            }
        }
        return null;
    }

    /**
     * Recorta un fragmento del texto alrededor de la primera palabra encontrada
     * (35 caracteres antes y 85 después) y resalta las palabras buscadas con <mark>.
     * @param {string} textoOriginal Texto completo (puede contener HTML).
     * @param {string[]} tokens Palabras buscadas, ya normalizadas.
     * @returns {string} HTML del fragmento, ya escapado.
     */
    function extraerSnippetConResaltado(textoOriginal, tokens) {
        const textoPlano = limpiarHtml(textoOriginal);
        if (!textoPlano) return '';

        const textoNorm = normalizarTexto(textoPlano);
        let mejorIndice = -1;

        for (const t of tokens) {
            const idx = textoNorm.indexOf(t);
            if (idx !== -1 && (mejorIndice === -1 || idx < mejorIndice)) {
                mejorIndice = idx;
            }
        }

        let textoRecortado = '';
        if (mejorIndice !== -1) {
            const inicio = Math.max(0, mejorIndice - 35);
            const fin = Math.min(textoPlano.length, mejorIndice + 85);
            textoRecortado = (inicio > 0 ? '… ' : '') + textoPlano.slice(inicio, fin) + (fin < textoPlano.length ? ' …' : '');
        } else {
            textoRecortado = textoPlano.length > 120 ? textoPlano.slice(0, 115) + ' …' : textoPlano;
        }

        const terminosNormalizados = tokens.filter(Boolean);
        if (terminosNormalizados.length === 0) return escaparHtml(textoRecortado);

        const regexSafe = terminosNormalizados
            .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('|');

        if (!regexSafe) return escaparHtml(textoRecortado);

        const regex = new RegExp(`(${regexSafe})`, 'gi');
        const partes = textoRecortado.split(regex);

        return partes.map(parte => {
            if (terminosNormalizados.includes(normalizarTexto(parte))) {
                return `<mark>${escaparHtml(parte)}</mark>`;
            }
            return escaparHtml(parte);
        }).join('');
    }

    /**
     * Obtiene el diccionario de textos del idioma. Reutiliza la caché y las funciones
     * de i18n.js y, si no están disponibles, lo descarga directamente.
     * @param {string} idioma
     * @returns {Promise<Object>} Diccionario clave -> texto.
     */
    async function obtenerDiccionarioActivo(idioma) {
        if (window.cacheTraducciones && window.cacheTraducciones[idioma]) {
            return window.cacheTraducciones[idioma];
        }
        if (typeof window.cargarDiccionario === 'function') {
            return await window.cargarDiccionario(idioma);
        }
        const resp = await fetch(`js/i18n/${idioma}.json`);
        return await resp.json();
    }

    /**
     * Prepara el buscador: localiza el botón y el <dialog> de la página y
     * registra todos los eventos (escritura, teclado, apertura y cierre).
     */
    function inicializarBuscador() {
        const botonAbrir = document.querySelector('body > header > nav:last-of-type > button[aria-haspopup="dialog"]');
        const dialog = document.querySelector('body > dialog');

        if (!dialog) return;

        const form = dialog.querySelector('form[role="search"]');
        const input = form ? form.querySelector('input[type="search"]') : null;
        const output = dialog.querySelector('output');

        // Temporizador para esperar 100 ms desde la última tecla antes de buscar
        let temporizadorDebounce = null;
        // Posición del resultado seleccionado con las flechas (-1 = ninguno)
        let indiceSeleccionado = -1;

        /** Abre la ventana del buscador, muestra las sugerencias y pone el foco en el campo. */
        function abrirModal() {
            if (typeof dialog.showModal === 'function') {
                dialog.showModal();
            } else {
                dialog.setAttribute('open', '');
            }

            if (botonAbrir) {
                botonAbrir.setAttribute('aria-expanded', 'true');
            }

            if (input) {
                input.value = '';
                mostrarSugerencias();
                input.focus();
            }
        }

        /** Cierra la ventana y devuelve el foco al botón que la abrió. */
        function cerrarModal() {
            if (typeof dialog.close === 'function') {
                dialog.close();
            } else {
                dialog.removeAttribute('open');
            }

            if (botonAbrir) {
                botonAbrir.setAttribute('aria-expanded', 'false');
                botonAbrir.focus();
            }
            indiceSeleccionado = -1;
        }

        /** Muestra las búsquedas sugeridas (del archivo de mapeo) como botones. */
        async function mostrarSugerencias() {
            if (!output) return;
            const idioma = obtenerIdiomaActual();

            let config;
            // Se cargan el diccionario (textos de la interfaz) y el mapeo (sugerencias)
            let diccionario;
            try {
                [diccionario, config] = await Promise.all([
                    obtenerDiccionarioActivo(idioma),
                    obtenerConfiguracionBuscador(idioma)
                ]);
            } catch (err) {
                console.error('Error al cargar configuración del buscador:', err);
                return;
            }

            // Los textos de la interfaz se toman del diccionario i18n (es.json / en.json)
            const tituloSugerencias = diccionario['search.quickTitle'];
            const botonesSugerencias = config.sugerencias.map(s => {
                return `<li><button type="button" data-query="${escaparHtml(s.query)}"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i> ${escaparHtml(s.label)}</button></li>`;
            }).join('');

            output.innerHTML = `
                <nav aria-label="${escaparHtml(tituloSugerencias)}">
                    <p>${escaparHtml(tituloSugerencias)}</p>
                    <ul>${botonesSugerencias}</ul>
                </nav>
            `;

            output.querySelectorAll('button[data-query]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const query = btn.getAttribute('data-query');
                    if (input) {
                        input.value = query;
                        ejecutarBusqueda();
                        input.focus();
                    }
                });
            });

            indiceSeleccionado = -1;
        }

        /**
         * Busca el texto escrito en el diccionario del idioma activo y muestra los resultados.
         * Pasos: normalizar la búsqueda, cargar los datos, puntuar cada clave,
         * agrupar por sección (URL), ordenar por puntuación y pintar la lista.
         */
        async function ejecutarBusqueda() {
            if (!input || !output) return;

            const query = input.value.trim();
            const idioma = obtenerIdiomaActual();

            if (!query) {
                mostrarSugerencias();
                return;
            }

            // 1. Normalizar la búsqueda y dividirla en palabras
            const tokens = normalizarTexto(query).split(/\s+/).filter(Boolean);
            if (tokens.length === 0) {
                mostrarSugerencias();
                return;
            }

            // 2. Cargar a la vez el diccionario y el archivo de mapeo
            let diccionario;
            let config;
            try {
                [diccionario, config] = await Promise.all([
                    obtenerDiccionarioActivo(idioma),
                    obtenerConfiguracionBuscador(idioma)
                ]);
            } catch (err) {
                console.error('Error al cargar recursos para búsqueda:', err);
                return;
            }

            // 3. Recorrer las claves del diccionario y puntuar las coincidencias.
            //    Los resultados se agrupan por URL: cada sección aparece una sola vez.
            const mapaResultados = new Map();

            for (const [clave, valor] of Object.entries(diccionario)) {
                if (!esClaveContenido(clave)) continue;

                const seccion = obtenerSeccionParaClave(clave, config.secciones);
                if (!seccion) continue;

                const textoPlano = limpiarHtml(valor);
                const textoNorm = normalizarTexto(textoPlano);
                const tituloNorm = normalizarTexto(seccion.titulo);
                const categoriaNorm = normalizarTexto(seccion.categoria);

                // Puntuación: título de la sección 12, encabezado (.h2/.h3) 8, resto del texto 4,
                // categoría 3; si aparece la búsqueda completa, +15 en el título y +10 en el texto
                let puntuacionClave = 0;
                let coincidenciaEncontrada = false;

                for (const token of tokens) {
                    if (tituloNorm.includes(token)) {
                        puntuacionClave += 12;
                        coincidenciaEncontrada = true;
                    }
                    if (textoNorm.includes(token)) {
                        puntuacionClave += (clave.endsWith('.h2') || clave.endsWith('.h3')) ? 8 : 4;
                        coincidenciaEncontrada = true;
                    }
                    if (categoriaNorm.includes(token)) {
                        puntuacionClave += 3;
                        coincidenciaEncontrada = true;
                    }
                }

                const queryNorm = normalizarTexto(query);
                if (tituloNorm.includes(queryNorm)) puntuacionClave += 15;
                if (textoNorm.includes(queryNorm)) puntuacionClave += 10;

                if (coincidenciaEncontrada && puntuacionClave > 0) {
                    if (!mapaResultados.has(seccion.url)) {
                        mapaResultados.set(seccion.url, {
                            url: seccion.url,
                            titulo: seccion.titulo,
                            categoria: seccion.categoria,
                            puntuacion: puntuacionClave,
                            mejorTexto: textoPlano
                        });
                    } else {
                        const actual = mapaResultados.get(seccion.url);
                        actual.puntuacion += puntuacionClave;
                        if (textoNorm.includes(tokens[0]) && (!actual.mejorTexto || actual.mejorTexto.length < textoPlano.length)) {
                            actual.mejorTexto = textoPlano;
                        }
                    }
                }
            }

            // 4. Ordenar de mayor a menor puntuación
            const resultados = Array.from(mapaResultados.values());
            resultados.sort((a, b) => b.puntuacion - a.puntuacion);

            // 5. Pintar el mensaje de "sin resultados" o la lista de resultados
            if (resultados.length === 0) {
                output.innerHTML = `
                    <p role="status">
                        <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
                        <strong>${escaparHtml(diccionario['search.noResults'])} "<mark>${escaparHtml(query)}</mark>"</strong>
                        <span>${escaparHtml(diccionario['search.noResultsAdvice'])}</span>
                    </p>
                `;
            } else {
                const itemsHtml = resultados.map((r, i) => {
                    const snippetResaltado = extraerSnippetConResaltado(r.mejorTexto, tokens);
                    const tituloResaltado = extraerSnippetConResaltado(r.titulo, tokens);
                    const categoriaHtml = escaparHtml(r.categoria);

                    return `
                        <li>
                            <article>
                                <a href="${r.url}" data-index="${i}">
                                    <header>
                                        <small>${categoriaHtml}</small>
                                        <h3>${tituloResaltado}</h3>
                                    </header>
                                    <p>${snippetResaltado}</p>
                                </a>
                            </article>
                        </li>
                    `;
                }).join('');

                output.innerHTML = `<ol>${itemsHtml}</ol>`;

                output.querySelectorAll('a').forEach(enlace => {
                    enlace.addEventListener('click', () => {
                        cerrarModal();
                    });
                });
            }

            indiceSeleccionado = -1;
        }

        if (input) {
            // Buscar mientras se escribe, esperando 100 ms desde la última tecla (debounce)
            input.addEventListener('input', () => {
                clearTimeout(temporizadorDebounce);
                temporizadorDebounce = setTimeout(ejecutarBusqueda, 100);
            });
        }

        // Teclado dentro de la ventana: flechas para moverse, Enter para abrir, Escape para cerrar
        dialog.addEventListener('keydown', (e) => {
            const enlaces = output ? Array.from(output.querySelectorAll('ol > li > article > a')) : [];

            if (e.key === 'ArrowDown') {
                if (enlaces.length === 0) return;
                e.preventDefault();
                indiceSeleccionado = (indiceSeleccionado + 1) % enlaces.length;
                actualizarFocoEnlace(enlaces);
            } else if (e.key === 'ArrowUp') {
                if (enlaces.length === 0) return;
                e.preventDefault();
                indiceSeleccionado = (indiceSeleccionado - 1 + enlaces.length) % enlaces.length;
                actualizarFocoEnlace(enlaces);
            } else if (e.key === 'Enter') {
                if (indiceSeleccionado >= 0 && enlaces[indiceSeleccionado]) {
                    e.preventDefault();
                    enlaces[indiceSeleccionado].click();
                }
            } else if (e.key === 'Escape') {
                cerrarModal();
            }
        });

        /** Marca y enfoca el resultado seleccionado con las flechas. */
        function actualizarFocoEnlace(enlaces) {
            enlaces.forEach((enlace, idx) => {
                if (idx === indiceSeleccionado) {
                    enlace.setAttribute('aria-selected', 'true');
                    enlace.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                    enlace.focus();
                } else {
                    enlace.removeAttribute('aria-selected');
                }
            });
        }

        if (form) {
            // Al borrar el campo, volver a mostrar las sugerencias
            form.addEventListener('reset', () => {
                setTimeout(() => {
                    mostrarSugerencias();
                    if (input) input.focus();
                }, 10);
            });

            // Enter en el campo: abrir el resultado seleccionado o, si no hay, el primero
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                // El botón "Esc" (value="cancel") también envía el formulario: en ese caso solo se cierra el modal
                if (e.submitter && e.submitter.value === 'cancel') {
                    cerrarModal();
                    return;
                }
                const enlaces = output ? Array.from(output.querySelectorAll('ol > li > article > a')) : [];
                if (indiceSeleccionado >= 0 && enlaces[indiceSeleccionado]) {
                    enlaces[indiceSeleccionado].click();
                } else if (enlaces.length > 0) {
                    enlaces[0].click();
                }
            });
        }

        // Cerrar al hacer clic fuera de la ventana (sobre el fondo oscurecido)
        dialog.addEventListener('click', (e) => {
            const rect = dialog.getBoundingClientRect();
            const clickFuera = (
                e.clientX < rect.left ||
                e.clientX > rect.right ||
                e.clientY < rect.top ||
                e.clientY > rect.bottom
            );
            if (clickFuera) {
                cerrarModal();
            }
        });

        // Al cerrarse por cualquier vía, actualizar el estado del botón
        dialog.addEventListener('close', () => {
            if (botonAbrir) {
                botonAbrir.setAttribute('aria-expanded', 'false');
            }
            indiceSeleccionado = -1;
        });

        if (botonAbrir) {
            // Abrir con el botón "Buscar" de la cabecera
            botonAbrir.addEventListener('click', abrirModal);
        }

        // Atajos globales "/" y Ctrl/Cmd + K (salvo si se está escribiendo en un campo)
        document.addEventListener('keydown', (e) => {
            const target = e.target;
            const esElementoTexto = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            if (esElementoTexto) return;

            if (e.key === '/' || ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey))) {
                e.preventDefault();
                abrirModal();
            }
        });

        // Si cambia el idioma con la ventana abierta, repetir la búsqueda en el nuevo idioma
        window.addEventListener('idiomacambiado', () => {
            if (dialog.hasAttribute('open')) {
                if (input && input.value.trim()) {
                    ejecutarBusqueda();
                } else {
                    mostrarSugerencias();
                }
            }
        });
    }

    // Iniciar el buscador cuando el HTML esté cargado
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarBuscador);
    } else {
        inicializarBuscador();
    }
})();
