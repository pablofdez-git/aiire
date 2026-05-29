document.addEventListener('DOMContentLoaded', () => {

    // Vinculamos los elementos de control que ya tenías en tu interfaz
    const buscador = document.getElementById('buscador-pacientes');
    const tablaCompleta = document.querySelector('.tabla-historial');
    const cuerpoTabla = document.getElementById('cuerpo-tabla-pacientes');
    const mensajeNoResultados = document.getElementById('mensaje-no-resultados');
    const contadorPacientes = document.getElementById('num-pacientes');

    // NUEVOS ELEMENTOS: Vinculamos el modal del historial clínico interactivo
    const modalHistorial = document.getElementById('modal-historial-paciente');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal-historial');
    const contenedorLineaTiempo = document.getElementById('linea-tiempo-citas');

    // Array maestro en memoria RAM para guardar a todos los pacientes que bajemos de internet
    let listaPacientesGlobal = [];

    // Helper para limpiar tildes y diéresis para que las búsquedas no sean tan rígidas
    const eliminarTildes = (texto) => {
        return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    };

    // ==========================================================================
    // 1. DESCARGA DEL HISTORIAL DE PACIENTES (Igual que antes)
    // ==========================================================================
    async function cargarHistorialDesdeNube() {
        try {
            const { data: pacientes, error } = await supabaseClient
                .from('pacientes')
                .select('*')
                .order('pr_apellido', { ascending: true }); // Ordenados alfabéticamente

            if (error) throw error;

            listaPacientesGlobal = pacientes;
            renderizarTablaPacientes(listaPacientesGlobal);

        } catch (error) {
            console.error("Error al cargar el historial:", error);
        }
    }

    // ==========================================================================
    // 2. GENERACIÓN DINÁMICA DE FILAS (Modificada para que sea interactiva)
    // ==========================================================================
    function renderizarTablaPacientes(lista) {
        if (!cuerpoTabla) return;
        cuerpoTabla.innerHTML = ''; // Vaciamos la tabla antes de redibujar

        if (contadorPacientes) contadorPacientes.textContent = lista.length;

        if (lista.length === 0) {
            if (tablaCompleta) tablaCompleta.style.display = 'none';
            if (mensajeNoResultados) mensajeNoResultados.classList.remove('oculto-busqueda');
            return;
        }

        if (tablaCompleta) tablaCompleta.style.display = 'table';
        if (mensajeNoResultados) mensajeNoResultados.classList.add('oculto-busqueda');

        lista.forEach(p => {
            const fila = document.createElement('tr');
            // Le metemos una clase nueva para poder darle estilos CSS de cursor tipo mano (pointer)
            fila.className = 'fila-paciente fila-clicable';

            // Le incrustamos el DNI en el dataset del elemento HTML para recuperarlo fácilmente
            fila.dataset.dni = p.dni;

            const nombreCompleto = `${p.nombre} ${p.pr_apellido} ${p.sg_apellido || ''}`.trim();

            fila.innerHTML = `
                <td class="td-nombre">
                    <strong>${nombreCompleto}</strong>
                    <span style="font-size:0.75rem; color:var(--azul-consciente); display:block; margin-top:2px;">
                        <i class="fa-solid fa-eye"></i> Haz clic para ver sesiones pasadas
                    </span>
                </td>
                <td class="td-dni">${p.dni}</td>
                <td class="td-tel">${p.telefono}</td>
                <td>
                    <div class="bloque-nota-historial">
                        <strong>Nota Ficha:</strong> ${p.notas_clinicas || 'Sin anotaciones generales.'}
                    </div>
                </td>
            `;

            // 🔥 EL GANCHOS DE CLIC: Al pinchar en cualquier parte de la fila, se abre su historial detallado
            fila.addEventListener('click', () => {
                abrirHistorialClinicoDetallado(p, nombreCompleto);
            });

            cuerpoTabla.appendChild(fila);
        });
    }

    // ==========================================================================
    // 3. NUEVA FUNCIÓN: CONSULTA RELACIONAL DE CITAS PASADAS (LA MAGIA)
    // ==========================================================================
    async function abrirHistorialClinicoDetallado(paciente, nombreCompleto) {
        // Rellenamos los datos del paciente en la cabecera fija del modal
        document.getElementById('modal-paciente-nombre').textContent = nombreCompleto;
        document.getElementById('modal-paciente-dni').textContent = paciente.dni;
        document.getElementById('modal-paciente-tel').textContent = paciente.telefono;

        // Inyectamos un spinner de carga temporal mientras Supabase responde
        contenedorLineaTiempo.innerHTML = '<p style="font-size:0.9rem; color:#666; padding:15px; text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando sesiones en el archivo clínico...</p>';

        // Activamos el modal visualmente metiendo la clase CSS correspondientes
        modalHistorial.classList.add('mostrar');

        try {
            // Hacemos el SELECT a la tabla "citas" buscando las que pertenezcan al DNI de este paciente
            const { data: citasPasadas, error } = await supabaseClient
                .from('citas')
                .select('fecha_hora, id_profesional, observaciones')
                .eq('dni_paciente', paciente.dni)
                .order('fecha_hora', { ascending: false }); // Las más NUEVAS salen arriba del todo

            if (error) throw error;

            contenedorLineaTiempo.innerHTML = ''; // Quitamos el spinner de carga

            // Si el tío está registrado pero nunca ha reservado una cita real:
            if (!citasPasadas || citasPasadas.length === 0) {
                contenedorLineaTiempo.innerHTML = '<p style="font-style:italic; color:#888; text-align:center; padding: 30px 0;"><i class="fa-solid fa-calendar-minus"></i> Este paciente no tiene ninguna sesión registrada en la agenda.</p>';
                return;
            }

            // Bucle: Procesamos cada cita recuperada y la transformamos en una píldora de la línea de tiempo
            citasPasadas.forEach(c => {
                // Formateamos la fecha rara de Supabase a algo humano en español (Ej: "29 may 2026")
                const objFecha = new Date(c.fecha_hora);
                const fechaLegible = objFecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
                const horaLegible = `${String(objFecha.getHours()).padStart(2, '0')}:${String(objFecha.getMinutes()).padStart(2, '0')}h`;

                // Identificamos a la profesional según el ID numérico corporativo de la base de datos
                const especialista = (c.id_profesional === 1) ? 'María Rosa' : 'Alba Rojo';
                const claseBorde = (c.id_profesional === 1) ? 'rosa' : 'alba';

                // Creamos el contenedor del bloque de la sesión
                const itemSesion = document.createElement('div');
                itemSesion.className = `sesion-item-linea fisio-borde-${claseBorde}`;

                itemSesion.innerHTML = `
                    <div class="sesion-meta">
                        <span class="sesion-fecha"><i class="fa-regular fa-calendar"></i> ${fechaLegible}</span>
                        <span class="sesion-hora"><i class="fa-regular fa-clock"></i> ${horaLegible}</span>
                        <span class="sesion-especialista"><i class="fa-solid fa-user-doctor"></i> Especialista: ${especialista}</span>
                    </div>
                    <div class="sesion-detalles">
                        <strong>Notas clínicas de esta sesión:</strong>
                        <p>${c.observaciones || 'No se registraron anotaciones específicas en esta consulta.'}</p>
                    </div>
                `;
                contenedorLineaTiempo.appendChild(itemSesion);
            });

        } catch (err) {
            console.error("Error al rescatar el historial médico:", err);
            contenedorLineaTiempo.innerHTML = '<p style="color:red; font-size:0.9rem; text-align:center; padding:15px;"><i class="fa-solid fa-triangle-exclamation"></i> Error crítico al conectar con el servidor clínico.</p>';
        }
    }

    // Listener para cerrar el modal interactivo con la cruz superior
    if (btnCerrarModal) {
        btnCerrarModal.addEventListener('click', () => {
            modalHistorial.classList.remove('mostrar');
        });
    }

    // ==========================================================================
    // 4. FILTRO DE BÚSQUEDA EN TIEMPO REAL (Igual que antes)
    // ==========================================================================
    if (buscador) {
        buscador.addEventListener('input', () => {
            const textoBusqueda = eliminarTildes(buscador.value.toLowerCase().trim());

            const pacientesFiltrados = listaPacientesGlobal.filter(p => {
                const nombreCompleto = eliminarTildes(`${p.nombre} ${p.pr_apellido} ${p.sg_apellido || ''}`.toLowerCase());
                const dni = p.dni.toLowerCase();
                const telefono = p.telefono.toLowerCase();

                return nombreCompleto.includes(textoBusqueda) ||
                       dni.includes(textoBusqueda) ||
                       telefono.includes(textoBusqueda);
            });

            renderizarTablaPacientes(pacientesFiltrados);

            if (pacientesFiltrados.length === 0 && mensajeNoResultados) {
                if (tablaCompleta) tablaCompleta.style.display = 'none';
                mensajeNoResultados.classList.remove('oculto-busqueda');
                mensajeNoResultados.innerHTML = `<i class="fa-solid fa-magnifying-glass-minus"></i> No se encontraron pacientes que coincidan con "${buscador.value}".`;
            }
        });
    }

    // Lanzamos la carga inicial nada más entrar en la pestaña
    cargarHistorialDesdeNube();
});
