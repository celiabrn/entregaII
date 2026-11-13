/**
 * Buscador dinámico de contenidos del sitio web basado en el diccionario i18n
 * - No requiere índice manual: lee directamente las claves y textos de es.json / en.json.
 * - Libre de <div> y clases CSS genéricas.
 * - Genera fragmentos contextuales dinámicos con resaltado <mark>.
 * - Soporte bilingüe y navegación por teclado (WCAG).
 */
(function() {
    'use strict';

    // Mapeo semántico de prefijos de traducción a destinos y secciones de la web
    const mapaSecciones = [
        // INICIO
        {
            prefijo: 'index.interests',
            url: 'index.html#intereses',
            categoria: { es: 'Inicio', en: 'Home' },
            titulo: { es: 'Páginas y secciones de interés', en: 'Pages and sections of interest' }
        },
        {
            prefijo: 'index',
            url: 'index.html#main-content',
            categoria: { es: 'Inicio', en: 'Home' },
            titulo: { es: 'Inicio · Bienvenida y presentación', en: 'Home · Welcome and introduction' }
        },

        // SOBRE MÍ
        {
            prefijo: 'about.personal',
            url: 'sobre-mi.html#personal',
            categoria: { es: 'Sobre mí', en: 'About me' },
            titulo: { es: 'Vida personal y biografía', en: 'Personal life and biography' }
        },
        {
            prefijo: 'about.pro',
            url: 'sobre-mi.html#profesional',
            categoria: { es: 'Sobre mí', en: 'About me' },
            titulo: { es: 'Vida profesional y contacto', en: 'Professional life and contact' }
        },
        {
            prefijo: 'about.cv',
            url: 'sobre-mi.html#presentacion',
            categoria: { es: 'Sobre mí', en: 'About me' },
            titulo: { es: 'Currículum Vitae (PDF)', en: 'Curriculum Vitae (PDF)' }
        },
        {
            prefijo: 'about.education',
            url: 'sobre-mi.html#formacion',
            categoria: { es: 'Sobre mí', en: 'About me' },
            titulo: { es: 'Formación académica y titulaciones', en: 'Academic education and degrees' }
        },
        {
            prefijo: 'about.skills',
            url: 'sobre-mi.html#competencias',
            categoria: { es: 'Sobre mí', en: 'About me' },
            titulo: { es: 'Competencias técnicas y proyectos', en: 'Technical skills and projects' }
        },
        {
            prefijo: 'about.endorsements',
            url: 'sobre-mi.html#avales',
            categoria: { es: 'Sobre mí', en: 'About me' },
            titulo: { es: 'Avales y referencias (TFG)', en: 'Endorsements and references (Thesis)' }
        },
        {
            prefijo: 'about',
            url: 'sobre-mi.html#presentacion',
            categoria: { es: 'Sobre mí', en: 'About me' },
            titulo: { es: 'Sobre mí', en: 'About me' }
        },

        // AFICIONES
        {
            prefijo: 'hobbies.coraline',
            url: 'aficiones.html#peliculas',
            categoria: { es: 'Mis aficiones', en: 'My hobbies' },
            titulo: { es: 'Películas · Los mundos de Coraline', en: 'Movies · Coraline' }
        },
        {
            prefijo: 'hobbies.wha',
            url: 'aficiones.html#peliculas',
            categoria: { es: 'Mis aficiones', en: 'My hobbies' },
            titulo: { es: 'Manga y animación · Witch Hat Atelier', en: 'Manga & animation · Witch Hat Atelier' }
        },
        {
            prefijo: 'hobbies.movies',
            url: 'aficiones.html#peliculas',
            categoria: { es: 'Mis aficiones', en: 'My hobbies' },
            titulo: { es: 'Películas y series', en: 'Movies and series' }
        },
        {
            prefijo: 'hobbies.animals',
            url: 'aficiones.html#animales',
            categoria: { es: 'Mis aficiones', en: 'My hobbies' },
            titulo: { es: 'Animales y mascotas · Otto y Orión', en: 'Animals and pets · Otto & Orión' }
        },
        {
            prefijo: 'hobbies.botany',
            url: 'aficiones.html#botanica',
            categoria: { es: 'Mis aficiones', en: 'My hobbies' },
            titulo: { es: 'Botánica · Jardín Botánico Atlántico de Gijón', en: 'Botany · Atlantic Botanical Garden of Gijón' }
        },
        {
            prefijo: 'hobbies',
            url: 'aficiones.html',
            categoria: { es: 'Mis aficiones', en: 'My hobbies' },
            titulo: { es: 'Mis aficiones', en: 'My hobbies' }
        },

        // VIAJES
        {
            prefijo: 'travels.trip1',
            url: 'viajes.html#sanabria',
            categoria: { es: 'Mis viajes', en: 'My travels' },
            titulo: { es: 'Viaje a Sanabria (Zamora)', en: 'Trip to Sanabria (Zamora)' }
        },
        {
            prefijo: 'travels.trip2',
            url: 'viajes.html#alemania',
            categoria: { es: 'Mis viajes', en: 'My travels' },
            titulo: { es: 'Viaje a Alemania (Baviera y Selva Negra)', en: 'Trip to Germany (Bavaria & Black Forest)' }
        },
        {
            prefijo: 'travels.trip3',
            url: 'viajes.html#estados-unidos',
            categoria: { es: 'Mis viajes', en: 'My travels' },
            titulo: { es: 'Viaje a Estados Unidos (Chicago)', en: 'Trip to United States (Chicago)' }
        },
        {
            prefijo: 'travels',
            url: 'viajes.html',
            categoria: { es: 'Mis viajes', en: 'My travels' },
            titulo: { es: 'Mis viajes', en: 'My travels' }
        },

        // MÚSICA
        {
            prefijo: 'music.saurom',
            url: 'musica.html#saurom',
            categoria: { es: 'Mi música', en: 'My music' },
            titulo: { es: 'Banda de música · Saurom (Folk metal)', en: 'Music band · Saurom (Folk metal)' }
        },
        {
            prefijo: 'music.binary',
            url: 'musica.html#the-binary',
            categoria: { es: 'Mi música', en: 'My music' },
            titulo: { es: 'Banda de música · The Binary (J-Pop / J-Rock)', en: 'Music band · The Binary (J-Pop / J-Rock)' }
        },
        {
            prefijo: 'music',
            url: 'musica.html',
            categoria: { es: 'Mi música', en: 'My music' },
            titulo: { es: 'Mi música favorita', en: 'My favorite music' }
        },

        // AYUDA
        {
            prefijo: 'help.navGuide',
            url: 'ayuda.html#guia',
            categoria: { es: 'Ayuda', en: 'Help' },
            titulo: { es: 'Ayuda · Guía de navegación', en: 'Help · Navigation guide' }
        },
        {
            prefijo: 'help.faq',
            url: 'ayuda.html#faq',
            categoria: { es: 'Ayuda', en: 'Help' },
            titulo: { es: 'Ayuda · Preguntas frecuentes (FAQ)', en: 'Help · Frequently Asked Questions' }
        },
        {
            prefijo: 'help',
            url: 'ayuda.html',
            categoria: { es: 'Ayuda', en: 'Help' },
            titulo: { es: 'Ayuda y guía de uso', en: 'Help & navigation guide' }
        }
    ];

    // Sugerencias rápidas para el estado inicial
    const sugerenciasIniciales = [
        { label: { es: "Avales y referencias", en: "Endorsements & thesis" }, query: "avales" },
        { label: { es: "Coraline", en: "Coraline" }, query: "Coraline" },
        { label: { es: "Otto y Orión", en: "Otto & Orión" }, query: "Otto" },
        { label: { es: "Jardín Botánico", en: "Botanical Garden" }, query: "Botánico" },
        { label: { es: "Sanabria", en: "Sanabria" }, query: "Sanabria" },
        { label: { es: "Alemania", en: "Germany" }, query: "Alemania" },
        { label: { es: "Saurom", en: "Saurom" }, query: "Saurom" },
        { label: { es: "Currículum PDF", en: "Resume PDF" }, query: "Currículum" }
    ];

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

    // Comprueba si una clave del diccionario pertenece al contenido buscable
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

    // Asocia una clave de traducción con su destino semántico
    function obtenerSeccionParaClave(clave, idioma) {
        for (const sec of mapaSecciones) {
            if (clave === sec.prefijo || clave.startsWith(sec.prefijo + '.')) {
                return {
                    url: sec.url,
                    categoria: sec.categoria[idioma] || sec.categoria.es,
                    titulo: sec.titulo[idioma] || sec.titulo.es
                };
            }
        }
        return null;
    }

    // Extrae un fragmento de texto alrededor de la coincidencia y resalta los términos con <mark>
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

        // Resaltar términos encontrados
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

        function mostrarSugerencias() {
            if (!output) return;
            const idioma = obtenerIdiomaActual();
            const tituloSugerencias = idioma === 'en' ? 'Quick suggestions:' : 'Sugerencias habituales:';

            const botonesSugerencias = sugerenciasIniciales.map(s => {
                const label = s.label[idioma] || s.label.es;
                return `<li><button type="button" data-query="${escaparHtml(s.query)}"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i> ${escaparHtml(label)}</button></li>`;
            }).join('');

            output.innerHTML = `
                <nav aria-label="${tituloSugerencias}">
                    <p>${tituloSugerencias}</p>
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
            try {
                diccionario = await obtenerDiccionarioActivo(idioma);
            } catch (err) {
                console.error('Error al cargar diccionario para búsqueda:', err);
                return;
            }

            // Agrupar coincidencias por sección destino (URL) para evitar duplicados
            const mapaResultados = new Map();

            for (const [clave, valor] of Object.entries(diccionario)) {
                if (!esClaveContenido(clave)) continue;

                const seccion = obtenerSeccionParaClave(clave, idioma);
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
                        // Priorizar texto descriptivo si contiene los tokens
                        if (textoNorm.includes(tokens[0]) && (!actual.mejorTexto || actual.mejorTexto.length < textoPlano.length)) {
                            actual.mejorTexto = textoPlano;
                        }
                    }
                }
            }

            const resultados = Array.from(mapaResultados.values());
            resultados.sort((a, b) => b.puntuacion - a.puntuacion);

            if (resultados.length === 0) {
                const textoNoResults = idioma === 'en'
                    ? 'No results found for'
                    : 'No se encontraron resultados para';
                const consejoNoResults = idioma === 'en'
                    ? 'Try searching for other words like movies, travels, music, botany or education.'
                    : 'Prueba a buscar otras palabras como películas, viajes, música, botánica o formación.';

                output.innerHTML = `
                    <p role="status">
                        <i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>
                        <strong>${textoNoResults} "<mark>${escaparHtml(query)}</mark>"</strong>
                        <span>${consejoNoResults}</span>
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

        // Navegación por teclado dentro del modal
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

        // Clic en el backdrop cierra el diálogo
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

        // Atajo global: '/' o 'Ctrl+K' / 'Cmd+K'
        document.addEventListener('keydown', (e) => {
            const target = e.target;
            const esElementoTexto = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            if (esElementoTexto) return;

            if (e.key === '/' || ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey))) {
                e.preventDefault();
                abrirModal();
            }
        });

        // Actualizar en tiempo real si se cambia el idioma
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
