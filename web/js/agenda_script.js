document.addEventListener('DOMContentLoaded', () => {

    // ==========================================================================
    // 1. MANEJO DE FECHAS EN LA INTERFAZ DE LA AGENDA (Flechas e Inputs)
    // ==========================================================================
    const selectorFecha = document.getElementById('selector-fecha-agenda');
    const btnAnterior = document.getElementById('btn-dia-anterior');
    const btnSiguiente = document.getElementById('btn-dia-siguiente');
    const btnHoy = document.getElementById('btn-hoy');
    let fechaActual = new Date(); // Guardamos el estado del día que se está visualizando

    // Helper: Convierte un objeto Date de JS en un string legible "YYYY-MM-DD" para selectores HTML
    function formatearFecha(fecha) {
        return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
    }

    // Actualiza el valor visual del calendario en pantalla y dispara la descarga de datos desde Supabase
    function actualizarFechaPantalla() {
        if (selectorFecha) {
            selectorFecha.value = formatearFecha(fechaActual);
            cargarCitasDesdeNube(); // Cada cambio de fecha obliga a ir a internet a leer los datos nuevos
        }
    }

    // Listeners para las flechas de navegación del calendario (+1 día, -1 día, o saltar a Hoy)
    if (btnAnterior) btnAnterior.addEventListener('click', () => { fechaActual.setDate(fechaActual.getDate() - 1); actualizarFechaPantalla(); });
    if (btnSiguiente) btnSiguiente.addEventListener('click', () => { fechaActual.setDate(fechaActual.getDate() + 1); actualizarFechaPantalla(); });
    if (btnHoy) btnHoy.addEventListener('click', () => { fechaActual = new Date(); actualizarFechaPantalla(); });
    if (selectorFecha) selectorFecha.addEventListener('change', () => { fechaActual = new Date(selectorFecha.value); actualizarFechaPantalla(); });

    // Configuración de la estructura de la tabla de la agenda diaria
    const turnosJornada = ["09:00", "10:00", "11:00", "12:00", "13:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
    let baseDatosCitas = []; // Array volátil en memoria RAM que almacena las citas procesadas del día actual
    let filtroActual = "todas"; // Estado del filtro de visualización ("todas", "maria_rosa" o "alba_rojo")

    // ==========================================================================
    // 2. BOTÓN FLOTANTE "VOLVER ARRIBA" (Scroll inteligente para móviles cortos)
    // ==========================================================================
    const btnArriba = document.getElementById('btn-volver-arriba');

    if (btnArriba) {
        window.addEventListener('scroll', () => {
            // El botón aparece mágicamente desvelándose solo si el usuario baja más de 300px en la agenda
            if (window.scrollY > 300) { btnArriba.classList.remove('oculto'); }
            else { btnArriba.classList.add('oculto'); }
        });

        btnArriba.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' }); // Sube la pantalla de forma fluida y elegante
        });
    }

    // ==========================================================================
    // 3. LEER CITAS (Usa el mismo cliente compartido de Supabase de index_script)
    // ==========================================================================
    async function cargarCitasDesdeNube() {
        const fechaFiltro = selectorFecha.value;

        try {
            // Hacemos una consulta relacional (equivalente a un INNER JOIN en SQL clásico).
            // Traemos los campos de la tabla "citas" y, gracias a la clave foránea, extraemos los
            // datos del paciente asociado que residen en la tabla "pacientes".
            const { data, error } = await supabaseClient
                .from('citas')
                .select(`
                    id,
                    fecha_hora,
                    id_profesional,
                    observaciones,
                    duracion,
                    pacientes (
                        dni,
                        nombre,
                        pr_apellido,
                        sg_apellido,
                        telefono
                    )
                `)
                .gte('fecha_hora', `${fechaFiltro} 00:00:00`) // Filtro desde el primer segundo del día
                .lte('fecha_hora', `${fechaFiltro} 23:59:59`); // Hasta el último segundo del día

            if (error) throw error;

            // MAPEADO DE NORMALIZACIÓN: Transformamos el JSON complejo e incómodo que nos manda Supabase
            // en un objeto plano de JavaScript súper limpio y fácil de recorrer
            baseDatosCitas = data.map(c => {
                const fechaObjeto = new Date(c.fecha_hora);
                const horas = String(fechaObjeto.getHours()).padStart(2, '0');
                const minutos = String(fechaObjeto.getMinutes()).padStart(2, '0');
                const horaTurno = `${horas}:${minutos}`; // Extraemos únicamente el tramo "HH:MM"

                const p = c.pacientes; // Alias corto para la parte del objeto del paciente relacional
                return {
                    id: c.id,
                    hora: horaTurno,
                    fisio : (c.id_profesional === 1) ? 'maria_rosa' : 'alba_rojo', // Convertimos ID numérico a String de control
                    nombre: p ? `${p.nombre} ${p.pr_apellido} ${p.sg_apellido || ''}`.trim() : 'Paciente Anónimo',
                    dni: p ? p.dni : '',
                    tel: p ? p.telefono : '',
                    tratamiento: 'Fisioterapia',
                    notas: c.observaciones // Mapeamos observaciones de la base de datos al campo de notas clínicas
                };
            });

            pintarAgenda(); // Forzamos el renderizado visual de las filas en el HTML una vez tenemos los datos limpios

        } catch (error) {
            console.error("Error cargando agenda:", error);
        }
    }

    // ==========================================================================
    // 4. RENDERIZACIÓN DE LA AGENDA DIARIA (Bucle generador de filas HTML)
    // ==========================================================================
    function pintarAgenda() {
        const contenedor = document.getElementById('contenedor-dinamico-horas');
        if (!contenedor) return;

        contenedor.innerHTML = ''; // Limpiamos por completo la agenda antigua antes de redibujar
        const fisios = ['maria_rosa', 'alba_rojo'];

        // Bucle 1: Iteramos por cada hora de la jornada laboral laboral (09:00, 10:00...)
        turnosJornada.forEach(hora => {

            // Decidimos qué profesionales pintar según el botón de filtro que esté pulsado
            const fisiosAMostrar = (filtroActual === 'todas') ? fisios : [filtroActual];

            // Bucle 2: Iteramos por cada profesional dentro de esa hora (Evita por completo el "efecto espejo")
            fisiosAMostrar.forEach(fisioId => {

                // Buscamos si en nuestro array en memoria existe una cita que coincida exactamente con la hora Y el profesional
                const cita = baseDatosCitas.find(c => c.hora === hora && c.fisio === fisioId);
                const fila = document.createElement('div');

                if (!cita) {
                    // CASO HUECO LIBRE: Generamos una fila limpia con un enlace directo que manda la hora y fisio por URL al index
                    fila.className = 'agenda-fila estado-libre';
                    fila.innerHTML = `
                        <div class="col-hora">${hora}</div>
                        <div class="col-estado">
                            <a href="../index.html?hora=${hora}&fisio=${fisioId}" class="enlace-hueco-libre">
                                <i class="fa-solid fa-plus"></i> Hueco disponible - ${fisioId === 'maria_rosa' ? 'María Rosa' : 'Alba Rojo'}
                            </a>
                        </div>
                    `;
                    contenedor.appendChild(fila);
                } else {
                    // CASO HUECO OCUPADO: Generamos la estructura de la cita con su tarjeta de color, botones de acción y burbuja tooltip oculta
                    fila.className = `agenda-fila estado-ocupado fisio-${cita.fisio}`;
                    fila.innerHTML = `
                        <div class="col-hora">${hora}</div>
                        <div class="col-estado">
                            <div class="bloque-cita">
                                <div class="cita-linea-superior">
                                    <span class="etiqueta-ocupado">Cita Asignada - ${cita.fisio === 'maria_rosa' ? 'María Rosa' : 'Alba Rojo'}</span>
                                    <div class="acciones-cita-wrapper">
                                        <button type="button" class="btn-accion-cita btn-editar-cita" data-hora="${hora}" data-fisio="${fisioId}"><i class="fa-solid fa-pen"></i></button>
                                        <button type="button" class="btn-accion-cita btn-eliminar-cita" data-hora="${hora}" data-fisio="${fisioId}"><i class="fa-solid fa-trash"></i></button>
                                        <button type="button" class="btn-whatsapp-recordatorio" data-hora="${hora}" data-fisio="${fisioId}"><i class="fa-brands fa-whatsapp"></i> Avisar</button>
                                    </div>
                                </div>
                                <div class="tooltip-paciente">
                                    <h3>${cita.nombre}</h3>
                                    <p><i class="fa-solid fa-id-card"></i> ${cita.dni}</p>
                                    <p><i class="fa-solid fa-phone"></i> ${cita.tel}</p>
                                    <div class="tooltip-notas"><strong>Notas / Observaciones:</strong> ${cita.notas || 'Sin observaciones.'}</div>
                                </div>
                            </div>
                        </div>
                    `;
                    contenedor.appendChild(fila);
                }
            });
        });

        // Una vez los elementos HTML existen en la pantalla, les inyectamos los listeners de clicks
        asignarEventosAcciones();
    }

    // ==========================================================================
    // 5. INTERACCIONES Y CONTROL DE ACCIONES DE LOS BOTONES
    // ==========================================================================
    const modal = document.getElementById('modal-editar-cita');
    const formModal = document.getElementById('form-modal-editar');

    // Inicializamos variables de control que actuarán de memoria temporal para saber qué ID de cita se está editando
    let citaSeleccionadaId = null;
    let horaTargetGlobal = "";

    // Formateador en tiempo real para el DNI dentro del modal emergente de edición
    const inputDniModal = document.getElementById('modal-input-dni');
    if (inputDniModal) {
        inputDniModal.addEventListener('input', () => {
            inputDniModal.value = inputDniModal.value.toUpperCase().replace(/[\s-]/g, '');
        });
    }

    function asignarEventosAcciones() {

        // --- ACCIÓN: LANZAR RECORDATORIO DE WHATSAPP ---
        document.querySelectorAll('.btn-whatsapp-recordatorio').forEach(b => {
            b.addEventListener('click', () => {
                // Buscamos la cita exacta usando el doble filtro de seguridad (Hora + Fisio) para no confundir de paciente
                const cita = baseDatosCitas.find(c => c.hora === b.dataset.hora && c.fisio === b.dataset.fisio);

                if (cita) {
                    // Creamos el mensaje formateado usando asteriscos para las negritas nativas de WhatsApp
                    const msg = `Hola ${cita.nombre}, te recordamos tu cita en *aiire* con *${cita.fisio === 'maria_rosa' ? 'María Rosa' : 'Alba Rojo'}* hoy a las *${cita.hora}hs*.`;
                    // Abrimos una pestaña externa llamando a la API pública de WhatsApp inyectando el teléfono y el texto codificado para URLs
                    window.open(`https://api.whatsapp.com/send?phone=34${cita.tel}&text=${encodeURIComponent(msg)}`, '_blank');
                }
            });
        });

        // --- ACCIÓN: ELIMINAR CITA DE LA NUBE ---
        document.querySelectorAll('.btn-eliminar-cita').forEach(b => {
            b.addEventListener('click', async () => {
                const cita = baseDatosCitas.find(c => c.hora === b.dataset.hora && c.fisio === b.dataset.fisio);
                if (!cita) return;

                // Confirmación de seguridad en el navegador para evitar clicks accidentales catastróficos
                if (confirm(`¿Seguro que quieres borrar de internet la cita de las ${cita.hora}h para ${cita.nombre}?`)) {
                    try {
                        // Ejecutamos una sentencia DELETE filtrando por la clave primaria única (ID) de la cita
                        const { error } = await supabaseClient
                            .from('citas')
                            .delete()
                            .eq('id', cita.id);

                        if (error) throw error;
                        alert("Cita eliminada de la base de datos.");
                        cargarCitasDesdeNube(); // Recargamos la agenda para hacer desaparecer la fila borrada
                    } catch (error) {
                        alert("Error al borrar la cita: " + error.message);
                    }
                }
            });
        });

        // --- ACCIÓN: ABRIR MODAL Y RELLENAR CAMPOS DE EDICIÓN ---
        document.querySelectorAll('.btn-editar-cita').forEach(b => {
            b.addEventListener('click', () => {
                const cita = baseDatosCitas.find(c => c.hora === b.dataset.hora && c.fisio === b.dataset.fisio);
                if (!cita) return;

                // Guardamos el ID único y la hora en las variables superiores para que el botón de guardar sepa qué actualizar luego
                citaSeleccionadaId = cita.id;
                horaTargetGlobal = cita.hora;

                // Inyectamos los datos actuales de la cita en los campos del modal flotante
                document.getElementById('modal-info-hora').textContent = cita.hora;
                document.getElementById('modal-edit-hora').value = cita.hora;
                document.getElementById('modal-input-nombre').value = cita.nombre;
                document.getElementById('modal-input-dni').value = cita.dni;
                document.getElementById('modal-input-tel').value = cita.tel;
                document.getElementById('modal-select-fisio').value = cita.fisio;

                // Cargamos el tratamiento guardado (almacenado históricamente en observaciones de la tabla citas)
                document.getElementById('modal-select-servicio').value = cita.notes || "Fisioterapia Musculoesquelética";
                document.getElementById('modal-textarea-notas').value = '';

                modal.classList.add('mostrar'); // Añadimos la clase CSS que activa la opacidad del modal
            });
        });
    }

    // Controles básicos para cerrar la ventana del modal pulsando la "X" o el botón de Cancelar
    if (document.getElementById('btn-cerrar-modal')) document.getElementById('btn-cerrar-modal').addEventListener('click', () => modal.classList.remove('mostrar'));
    if (document.getElementById('btn-modal-cancelar')) document.getElementById('btn-modal-cancelar').addEventListener('click', () => modal.classList.remove('mostrar'));

    // --- ENVIAR CAMBIOS DEL MODAL (UPDATE EN SUPABASE) ---
    if (formModal) {
        formModal.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Capturamos las modificaciones del modal
            const nuevaFisio = document.getElementById('modal-select-fisio').value;
            const idProfesional = (nuevaFisio === 'maria_rosa') ? 1 : 2;
            const tratamientoElegido = document.getElementById('modal-select-servicio').value;

            const fechaFiltro = selectorFecha.value;
            const nuevoTimestamp = `${fechaFiltro} ${horaTargetGlobal}:00`; // Reconstruimos la estampa de tiempo completa

            try {
                // Lanzamos la consulta UPDATE a la tabla "citas" aplicando los cambios únicamente a la fila que coincida con el ID guardado
                const { error } = await supabaseClient
                    .from('citas')
                    .update({
                        id_profesional: idProfesional,
                        observaciones: tratamientoElegido, // Guardamos el tratamiento elegido dentro de observaciones corporativas
                        fecha_hora: nuevoTimestamp
                    })
                    .eq('id', citaSeleccionadaId);

                if (error) throw error;

                modal.classList.remove('mostrar'); // Cerramos la ventana flotante con éxito
                alert("Cita modificada con éxito.");
                cargarCitasDesdeNube(); // Refrescamos la agenda para ver los cambios aplicados en vivo
            } catch (error) {
                alert("Error al actualizar los datos en el servidor: " + error.message);
            }
        });
    }

    // ==========================================================================
    // 6. GESTIÓN DE FILTROS SUPERIORES (Ver Ambas, María Rosa, Alba Rojo)
    // ==========================================================================
    document.querySelectorAll('.btn-filtro').forEach(boton => {
        boton.addEventListener('click', () => {
            // Quitamos los estilos activos a todos los botones y se los asignamos únicamente al pulsado
            document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('active', 'activo'));
            boton.classList.add('activo');

            // Actualizamos la variable de filtro global con la información del data-attribute ("todas", "maria_rosa"...)
            filtroActual = boton.getAttribute('data-fisio');
            pintarAgenda(); // Volvemos a generar la tabla HTML aplicando el filtro nuevo
        });
    });

    // Arrancamos el ciclo de vida de la página llamando a la inicialización automática de fechas
    actualizarFechaPantalla();
});
