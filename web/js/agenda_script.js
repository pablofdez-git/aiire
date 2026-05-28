document.addEventListener('DOMContentLoaded', () => {

    // ==========================================================================
    // CONTROLES DE FECHA DE LA AGENDA
    // ==========================================================================
    const selectorFecha = document.getElementById('selector-fecha-agenda');
    const btnAnterior = document.getElementById('btn-dia-anterior');
    const btnSiguiente = document.getElementById('btn-dia-siguiente');
    const btnHoy = document.getElementById('btn-hoy');
    let fechaActual = new Date();

    function formatearFecha(fecha) {
        return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
    }

    function actualizarFechaPantalla() {
        if (selectorFecha) {
            selectorFecha.value = formatearFecha(fechaActual);
            cargarCitasDesdeNube();
        }
    }

    if (btnAnterior) btnAnterior.addEventListener('click', () => { fechaActual.setDate(fechaActual.getDate() - 1); actualizarFechaPantalla(); });
    if (btnSiguiente) btnSiguiente.addEventListener('click', () => { fechaActual.setDate(fechaActual.getDate() + 1); actualizarFechaPantalla(); });
    if (btnHoy) btnHoy.addEventListener('click', () => { fechaActual = new Date(); actualizarFechaPantalla(); });
    if (selectorFecha) selectorFecha.addEventListener('change', () => { fechaActual = new Date(selectorFecha.value); actualizarFechaPantalla(); });

    // Configuración de la jornada laboral
    const turnosJornada = ["09:00", "10:00", "11:00", "12:00", "13:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
    let baseDatosCitas = [];
    let filtroActual = "todas";

    // ==========================================================================
    // LEER DATOS (Usa el supabaseClient global creado por index_script.js)
    // ==========================================================================
    async function cargarCitasDesdeNube() {
        const fechaFiltro = selectorFecha.value;

        try {
            // Usamos el cliente compartido sin volver a declararlo
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
                .gte('fecha_hora', `${fechaFiltro} 00:00:00`)
                .lte('fecha_hora', `${fechaFiltro} 23:59:59`);

            if (error) throw error;

            baseDatosCitas = data.map(c => {
                const fechaObjeto = new Date(c.fecha_hora);
                const horas = String(fechaObjeto.getHours()).padStart(2, '0');
                const minutos = String(fechaObjeto.getMinutes()).padStart(2, '0');
                const horaTurno = `${horas}:${minutos}`;

                const p = c.pacientes;
                return {
                    id: c.id,
                    hora: horaTurno,
                    fisio : (c.id_profesional === 1) ? 'maria_rosa' : 'alba_rojo',
                    nombre: p ? `${p.nombre} ${p.pr_apellido} ${p.sg_apellido || ''}`.trim() : 'Paciente Anónimo',
                    dni: p ? p.dni : '',
                    tel: p ? p.telefono : '',
                    tratamiento: 'Fisioterapia',
                    notas: c.observaciones // Revertido a .notas para mantener consistencia
                };
            });

            pintarAgenda();

        } catch (error) {
            console.error("Error cargando agenda:", error);
        }
    }

    // ==========================================================================
    // RENDERIZAR LA TABLA EN PANTALLA
    // ==========================================================================
    function pintarAgenda() {
        const contenedor = document.getElementById('contenedor-dinamico-horas');
        if (!contenedor) return;

        contenedor.innerHTML = '';

        turnosJornada.forEach(hora => {
            const cita = baseDatosCitas.find(c => c.hora === hora);
            const fila = document.createElement('div');

            if (!cita) {
                fila.className = 'agenda-fila estado-libre';
                fila.innerHTML = `
                    <div class="col-hora">${hora}</div>
                    <div class="col-estado">
                        <a href="../index.html?hora=${hora}" class="enlace-hueco-libre"><i class="fa-solid fa-plus"></i> Hueco disponible</a>
                    </div>
                `;
                contenedor.appendChild(fila);
            } else {
                if (filtroActual !== 'todas' && cita.fisio !== filtroActual) return;

                fila.className = `agenda-fila estado-ocupado fisio-${cita.fisio}`;
                fila.innerHTML = `
                    <div class="col-hora">${hora}</div>
                    <div class="col-estado">
                        <div class="bloque-cita">
                            <div class="cita-linea-superior">
                                <span class="etiqueta-ocupado">Cita Asignada - ${cita.fisio === 'maria_rosa' ? 'María Rosa' : 'Alba Rojo'}</span>
                                <div class="acciones-cita-wrapper">
                                    <button type="button" class="btn-accion-cita btn-editar-cita" data-hora="${hora}"><i class="fa-solid fa-pen"></i></button>
                                    <button type="button" class="btn-accion-cita btn-eliminar-cita" data-hora="${hora}"><i class="fa-solid fa-trash"></i></button>
                                    <button type="button" class="btn-whatsapp-recordatorio" data-hora="${hora}"><i class="fa-brands fa-whatsapp"></i> Avisar</button>
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

        asignarEventosAcciones();
    }

    // ==========================================================================
    // INTERACCIONES Y CONTROL DE ACCIONES (UPDATE / DELETE / WHATSAPP)
    // ==========================================================================
    const modal = document.getElementById('modal-editar-cita');
    const formModal = document.getElementById('form-modal-editar');

    function asignarEventosAcciones() {
        document.querySelectorAll('.btn-whatsapp-recordatorio').forEach(b => {
            b.addEventListener('click', () => {
                const cita = baseDatosCitas.find(c => c.hora === b.dataset.hora);
                const msg = `Hola ${cita.nombre}, te recordamos tu cita en *aiire* con *${cita.fisio === 'maria_rosa' ? 'María Rosa' : 'Alba Rojo'}* hoy a las *${cita.hora}hs*.`;
                window.open(`https://api.whatsapp.com/send?phone=34${cita.tel}&text=${encodeURIComponent(msg)}`, '_blank');
            });
        });

        document.querySelectorAll('.btn-eliminar-cita').forEach(b => {
            b.addEventListener('click', async () => {
                const cita = baseDatosCitas.find(c => c.hora === b.dataset.hora);
                if (confirm(`¿Seguro que quieres borrar de internet la cita de las ${cita.hora}h para ${cita.nombre}?`)) {
                    try {
                        const { error } = await supabaseClient
                            .from('citas')
                            .delete()
                            .eq('id', cita.id);

                        if (error) throw error;
                        alert("Cita eliminada de la base de datos.");
                        cargarCitasDesdeNube();
                    } catch (error) {
                        alert("Error al borrar la cita: " + error.message);
                    }
                }
            });
        });

        document.querySelectorAll('.btn-editar-cita').forEach(b => {
            b.addEventListener('click', () => {
                const cita = baseDatosCitas.find(c => c.hora === b.dataset.hora);
                document.getElementById('modal-info-hora').textContent = cita.hora;
                document.getElementById('modal-edit-hora').value = cita.hora;
                document.getElementById('modal-input-nombre').value = cita.nombre;
                document.getElementById('modal-input-dni').value = cita.dni;
                document.getElementById('modal-input-tel').value = cita.tel;
                document.getElementById('modal-select-fisio').value = cita.fisio;
                document.getElementById('modal-textarea-notas').value = cita.notas || '';
                modal.classList.add('mostrar');
            });
        });
    }

    if (document.getElementById('btn-cerrar-modal')) document.getElementById('btn-cerrar-modal').addEventListener('click', () => modal.classList.remove('mostrar'));
    if (document.getElementById('btn-modal-cancelar')) document.getElementById('btn-modal-cancelar').addEventListener('click', () => modal.classList.remove('mostrar'));

    if (formModal) {
        formModal.addEventListener('submit', async (e) => {
            e.preventDefault();
            const horaTarget = document.getElementById('modal-edit-hora').value;
            const cita = baseDatosCitas.find(c => c.hora === horaTarget);

            const nuevaFisio = document.getElementById('modal-select-fisio').value;
            const idProfesional = (nuevaFisio === 'maria_rosa') ? 1 : 2;
            const notasNuevas = document.getElementById('modal-textarea-notas').value.trim();

            const fechaFiltro = selectorFecha.value;
            const nuevoTimestamp = `${fechaFiltro} ${horaTarget}:00`;

            try {
                const { error } = await supabaseClient
                    .from('citas')
                    .update({
                        id_profesional: idProfesional,
                        observaciones: notasNuevas,
                        fecha_hora: nuevoTimestamp
                    })
                    .eq('id', cita.id);

                if (error) throw error;

                modal.classList.remove('mostrar');
                alert("Cita modificada con éxito.");
                cargarCitasDesdeNube();
            } catch (error) {
                alert("Error al actualizar los datos en el servidor: " + error.message);
            }
        });
    }

    document.querySelectorAll('.btn-filtro').forEach(boton => {
        boton.addEventListener('click', () => {
            document.querySelectorAll('.btn-filtro').forEach(b => b.classList.remove('active', 'activo'));
            boton.classList.add('activo');
            filtroActual = boton.getAttribute('data-fisio');
            pintarAgenda();
        });
    });

    actualizarFechaPantalla();
});
