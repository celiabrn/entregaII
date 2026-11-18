/**
 * Buscador dinámico de contenidos del sitio web basado en el diccionario i18n
 * - Carga los mapeos de secciones, sugerencias y textos de interfaz desde archivos JSON externos (js/i18n/buscador-{idioma}.json).
 * - Libre de <div> y clases CSS genéricas.
 * - Genera fragmentos contextuales dinámicos con resaltado <mark>.
 * - Soporte bilingüe y navegación por teclado (WCAG).
 */
(function() {
    'use strict';

    const cacheConfiguracion = {};

    function obtenerIdiomaActual() {
        return localStorage.getItem('idioma_pref') || document.documentElement.lang || 'es';
    }

    function normalizarTexto(texto) {
        return (texto || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    }

    function limpiarHtml(textoConHtml) {
        return (textoConHtml || '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function escaparHtml(texto) {
        return (texto || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function esClaveContenido(clave) {
        return !clave.startsWith('skip.') &&
               !clave.startsWith('lang.') &&
               !clave.startsWith('header.') &&
               !clave.startsWith('footer.') &&
               !clave.startsWith('404.') &&
               !clave.startsWith('search.') &&
               !clave.endsWith('.btn') &&
               !clave.endsWith('.meta.title') &&
               !clave.endsWith('.caption');
    }

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

    function inicializarBuscador() {
        const botonAbrir = document.querySelector('body > header > nav:last-of-type > button[aria-haspopup="dialog"]');
        const dialog = document.querySelector('body > dialog');

        if (!dialog) return;

        const form = dialog.querySelector('form[role="search"]');
        const input = form ? form.querySelector('input[type="search"]') : null;
        const output = dialog.querySelector('output');

        let temporizadorDebounce = null;
        let indiceSeleccionado = -1;

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

        async function mostrarSugerencias() {
            if (!output) return;
            const idioma = obtenerIdiomaActual();

            let config;
            try {
                config = await obtenerConfiguracionBuscador(idioma);
            } catch (err) {
                console.error('Error al cargar configuración del buscador:', err);
                return;
            }

            const tituloSugerencias = config.ui.tituloSugerencias;
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

        async function ejecutarBusqueda() {
            if (!input || !output) return;

            const query = input.value.trim();
            const idioma = obtenerIdiomaActual();

            if (!query) {
                mostrarSugerencias();
                return;
            }

            const tokens = normalizarTexto(query).split(/\s+/).filter(Boolean);
            if (tokens.length === 0) {
                mostrarSugerencias();
                return;
            }

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

            const mapaResultados = new Map();

            for (const [clave, valor] of Object.entries(diccionario)) {
                if (!esClaveContenido(clave)) continue;

                const seccion = obtenerSeccionParaClave(clave, config.secciones);
                if (!seccion) continue;

                const textoPlano = limpiarHtml(valor);
                const textoNorm = normalizarTexto(textoPlano);
                const tituloNorm = normalizarTexto(seccion.titulo);
                const categoriaNorm = normalizarTexto(seccion.categoria);

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

            const resultados = Array.from(mapaResultados.values());
            resultados.sort((a, b) => b.puntuacion - a.puntuacion);

            if (resultados.length === 0) {
                output.innerHTML = `
                    <p role="status">
                        <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
                        <strong>${escaparHtml(config.ui.sinResultados)} "<mark>${escaparHtml(query)}</mark>"</strong>
                        <span>${escaparHtml(config.ui.consejoSinResultados)}</span>
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
            input.addEventListener('input', () => {
                clearTimeout(temporizadorDebounce);
                temporizadorDebounce = setTimeout(ejecutarBusqueda, 100);
            });
        }

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
            form.addEventListener('reset', () => {
                setTimeout(() => {
                    mostrarSugerencias();
                    if (input) input.focus();
                }, 10);
            });

            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const enlaces = output ? Array.from(output.querySelectorAll('ol > li > article > a')) : [];
                if (indiceSeleccionado >= 0 && enlaces[indiceSeleccionado]) {
                    enlaces[indiceSeleccionado].click();
                } else if (enlaces.length > 0) {
                    enlaces[0].click();
                }
            });
        }

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

        dialog.addEventListener('close', () => {
            if (botonAbrir) {
                botonAbrir.setAttribute('aria-expanded', 'false');
            }
            indiceSeleccionado = -1;
        });

        if (botonAbrir) {
            botonAbrir.addEventListener('click', abrirModal);
        }

        document.addEventListener('keydown', (e) => {
            const target = e.target;
            const esElementoTexto = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            if (esElementoTexto) return;

            if (e.key === '/' || ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey))) {
                e.preventDefault();
                abrirModal();
            }
        });

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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarBuscador);
    } else {
        inicializarBuscador();
    }
})();
