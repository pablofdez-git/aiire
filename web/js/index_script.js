// ==========================================================================
// CONFIGURACIÓN Y CONEXIÓN CON LA BASE DE DATOS CLOUD (SUPABASE)
// ==========================================================================
const SUPABASE_URL = "https://oxjqhyyxaygugwtykrod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_F7gjljAey0RdnDdvaoiA-g_I_P3-qCH";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================================================
    // CONTROL TOTAL DEL LOGO SEGURO (PARA TODAS LAS PÁGINAS)
    // ==========================================================================
    const logo = document.querySelector('.logo-aiire');
    if (logo) {
        // Al entrar el ratón, añadimos la clase que las alinea y les cambia el color
        logo.addEventListener('mouseenter', () => {
            logo.classList.add('activo');
        });
        // Al salir el ratón, removemos la clase para que vuelvan a su posición loca original
        logo.addEventListener('mouseleave', () => {
            logo.classList.remove('activo');
        });
    }

    // ==========================================================================
    // LIMITACIÓN DE FECHAS EN EL CALENDARIO (Solo si existe en la página actual)
    // ==========================================================================
    const inputFecha = document.getElementById('cita-fecha');
    if (inputFecha) {
        const hoy = new Date();
        const añoMin = hoy.getFullYear();
        const mesMin = String(hoy.getMonth() + 1).padStart(2, '0');
        const diaMin = String(hoy.getDate()).padStart(2, '0');
        inputFecha.min = `${añoMin}-${mesMin}-${diaMin}`;

        const añoMax = añoMin + 10;
        inputFecha.max = `${añoMax}-12-31`;
    }

    // ==========================================================================
    // RECEPCIÓN DE PARÁMETROS URL (Solo si existe en la página actual)
    // ==========================================================================
    const parametrosURL = new URLSearchParams(window.location.search);
    if (parametrosURL.has('hora')) {
        const inputHora = document.getElementById('cita-hora');
        if (inputHora) inputHora.value = parametrosURL.get('hora');
    }

    // ==========================================================================
    // ESCUDO ANTI-INCONSISTENCIA: AUTOCOMPLETADO Y BLOQUEO POR DNI
    // ==========================================================================
    const inputDni = document.getElementById('paciente-dni');
    const inputNombre = document.getElementById('paciente-nombre');
    const inputTelefono = document.getElementById('paciente-telefono');
    const btnEditarPaciente = document.getElementById('btn-editar-paciente-existe');

    if (inputDni) {
        // El evento 'change' se dispara cuando el usuario sale del input (pierde el foco) o pulsa Intro
        inputDni.addEventListener('change', async () => {
            const dniBuscar = inputDni.value.trim().toUpperCase();
            if (dniBuscar.length < 5) return; // Evitamos peticiones absurdas con 3 letras

            try {
                // Buscamos si el paciente ya tiene ficha en Supabase
                const { data: paciente, error } = await supabaseClient
                    .from('pacientes')
                    .select('nombre, pr_apellido, sg_apellido, telefono')
                    .eq('dni', dniBuscar)
                    .maybeSingle();

                if (error) throw error;

                if (paciente) {
                    // ¡Existe! Rellenamos los campos combinando el nombre completo
                    const apellido2 = paciente.sg_apellido ? ` ${paciente.sg_apellido}` : '';
                    inputNombre.value = `${paciente.nombre} ${paciente.pr_apellido}${apellido2}`.trim();
                    inputTelefono.value = paciente.telefono;

                    // Bloqueamos para evitar erratas accidentales
                    inputNombre.readOnly = true;
                    inputTelefono.readOnly = true;

                    // Mostramos el botón de auxilio por si quieren editar al paciente
                    if (btnEditarPaciente) btnEditarPaciente.classList.remove('oculto');

                    console.log(`🎯 Paciente veterano detectado: ${inputNombre.value}`);
                } else {
                    // No existe, es nuevo. Aseguramos que los campos estén limpios y usables
                    inputNombre.readOnly = false;
                    inputTelefono.readOnly = false;
                    if (btnEditarPaciente) btnEditarPaciente.classList.add('oculto');
                }

            } catch (err) {
                console.error("Error al verificar el DNI:", err);
            }
        });
    }

    // Lógica del botón de auxilio: si hacen click, les dejamos editar el nombre/teléfono
    if (btnEditarPaciente) {
        btnEditarPaciente.addEventListener('click', () => {
            inputNombre.readOnly = false;
            inputTelefono.readOnly = false;
            inputNombre.focus();
            alert("⚠️ Estás editando la ficha global del paciente. Al guardar la cita, se actualizarán sus datos en el historial.");
        });
    }

    // ==========================================================================
    // EVENTO FORMULARIO: GUARDAR CITA (Solo si el formulario existe en pantalla)
    // ==========================================================================
    const formulario = document.getElementById('form-gestion-cita');

    if (formulario) {
        formulario.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nombreCompleto = document.getElementById('paciente-nombre').value.trim();
            const dniInput = document.getElementById('paciente-dni').value.trim().toUpperCase();
            const telefono = document.getElementById('paciente-telefono').value.trim();
            const fecha = document.getElementById('cita-fecha').value;
            const hora = document.getElementById('cita-hora').value;
            const fisioSeleccionada = document.getElementById('cita-fisio').value;
            const tratamiento = document.getElementById('cita-servicio').value;
            const notas = document.getElementById('cita-notas').value.trim();

            const partesNombre = nombreCompleto.split(' ');
            const nombre = partesNombre[0] || 'Sin nombre';
            const pr_apellido = partesNombre[1] || 'Sin Apellido';
            const sg_apellido = partesNombre.slice(2).join(' ') || null;

            const idProfesional = (fisioSeleccionada === 'maria_rosa') ? 1 : 2;
            const fechaHoraTimestamp = `${fecha} ${hora}:00`;

            try {
                // --- ESCUDO 0: EVITAR CITAS DUPLICADAS (PISADOS) ---
                // Comprobamos si esa fisio ya tiene una cita exactamente a esa hora
                const { data: citaDuplicada, error: errorValidacion } = await supabaseClient
                    .from('citas')
                    .select('id')
                    .eq('fecha_hora', fechaHoraTimestamp)
                    .eq('id_profesional', idProfesional)
                    .maybeSingle();

                if (errorValidacion) throw errorValidacion;

                // Si encuentra una cita, frenamos en seco la ejecución
                if (citaDuplicada) {
                    alert(`🚨 ¡Ojo! Esa hora ya está ocupada para la fisioterapeuta seleccionada. Elige otro hueco.`);
                    return; // Corta la ejecución aquí y no guarda nada
                }
                // --- ESCUDO A: PACIENTES ---
                const { data: pacienteExistente, error: errorBusqueda } = await supabaseClient
                    .from('pacientes')
                    .select('dni')
                    .eq('dni', dniInput)
                    .maybeSingle();

                if (errorBusqueda) throw errorBusqueda;

                if (!pacienteExistente) {
                    // Si no existe, lo insertamos normal
                    const { error: errorInsertPaciente } = await supabaseClient
                        .from('pacientes')
                        .insert([{
                            dni: dniInput,
                            nombre: nombre,
                            pr_apellido: pr_apellido,
                            sg_apellido: sg_apellido,
                            telefono: telefono,
                            notas_clinicas: notas
                        }]);

                    if (errorInsertPaciente) throw errorInsertPaciente;
                    console.log(`✅ Nuevo paciente [${dniInput}] guardado en la nube.`);
                } else {
                    // ¡REPARACIÓN AQUÍ!: Si ya existía, hacemos un UPDATE por si el usuario
                    // ha modificado el teléfono o corregido el nombre al darle a editar
                    const { error: errorUpdatePaciente } = await supabaseClient
                        .from('pacientes')
                        .update({
                            nombre: nombre,
                            pr_apellido: pr_apellido,
                            sg_apellido: sg_apellido,
                            telefono: telefono
                            // Las notas clínicas de la ficha no las pisamos para no borrar su historial médico antiguo
                        })
                        .eq('dni', dniInput);

                    if (errorUpdatePaciente) throw errorUpdatePaciente;
                    console.log(`🔄 Ficha del paciente [${dniInput}] actualizada en el historial.`);
                }

                // --- ESCUDO B: CITAS ---
                const { error: errorInsertCita } = await supabaseClient
                    .from('citas')
                    .insert([{
                        dni_paciente: dniInput,
                        id_profesional: idProfesional,
                        fecha_hora: fechaHoraTimestamp,
                        id_sala: 1,
                        duracion: 60,
                        observaciones: notas
                    }]);

                if (errorInsertCita) throw errorInsertCita;

                alert(`¡Cita guardada con éxito en la nube para ${nombreCompleto}!`);
                formulario.reset();
                // Reseteamos los estados de bloqueo del formulario
                inputNombre.readOnly = false;
                inputTelefono.readOnly = false;
                if (btnEditarPaciente) btnEditarPaciente.classList.add('oculto');

            } catch (error) {
                console.error("Error crítico en Supabase:", error);
                alert("Hubo un error al conectar con la base de datos: " + error.message);
            }
        });
    }

    // ==========================================================================
    // LÓGICA DEL BUSCADOR DE HUECOS LIBRES EXPRESS (Solo si existe en pantalla)
    // ==========================================================================
    const btnDesplegar = document.getElementById('btn-desplegar-huecos');
    const panelHuecos = document.getElementById('wrapper-buscador-huecos');
    const listaHuecosContenedor = document.getElementById('lista-huecos-libres');
    const botonesFranja = document.querySelectorAll('.btn-franja');
    const turnosTotales = ["09:00", "10:00", "11:00", "12:00", "13:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

    if (btnDesplegar && panelHuecos) {
        btnDesplegar.addEventListener('click', () => {
            panelHuecos.classList.toggle('abierto');
            listaHuecosContenedor.innerHTML = '';
            botonesFranja.forEach(b => b.classList.remove('activo'));
        });

        botonesFranja.forEach(boton => {
            // Convertimos el callback en async para poder usar await con Supabase
            boton.addEventListener('click', async () => {
                const fechaSeleccionada = inputFecha ? inputFecha.value : '';

                if (!fechaSeleccionada) {
                    alert("⚠️ Por favor, selecciona primero una fecha en el calendario para buscar huecos libres.");
                    return;
                }

                botonesFranja.forEach(b => b.classList.remove('activo'));
                boton.classList.add('activo');

                listaHuecosContenedor.innerHTML = '<p style="font-size:0.9rem; color:#666;"><i class="fa-solid fa-spinner fa-spin"></i> Consultando disponibilidad...</p>';

                try {
                    // 1. Pedimos a Supabase las citas de esa fecha concreta
                    const { data: citasDelDia, error } = await supabaseClient
                        .from('citas')
                        .select('fecha_hora, id_profesional')
                        .gte('fecha_hora', `${fechaSeleccionada} 00:00:00`)
                        .lte('fecha_hora', `${fechaSeleccionada} 23:59:59`);

                    if (error) throw error;

                    // 2. Mapeamos cuántas citas hay por cada hora.
                    // Si una hora tiene 2 citas, significa que tanto María Rosa como Alba están ocupadas (Lleno total)
                    const ocupacionPorHora = {};
                    citasDelDia.forEach(c => {
                        const horaCita = c.fecha_hora.split(' ')[1].substring(0, 5); // Extrae "HH:MM"
                        ocupacionPorHora[horaCita] = (ocupacionPorHora[horaCita] || 0) + 1;
                    });

                    // 3. Filtramos la franja horaria seleccionada
                    const franja = boton.getAttribute('data-franja');
                    let turnosFiltrados = (franja === 'manana') ? turnosTotales.filter(t => t < "14:00") :
                                          (franja === 'tarde') ? turnosTotales.filter(t => t >= "14:00") : [...turnosTotales];

                    // 4. Excluimos las horas donde YA NO QUEDEN fisioterapeutas libres (ocupación >= 2)
                    let turnosLibresReales = turnosFiltrados.filter(hora => {
                        return (ocupacionPorHora[hora] || 0) < 2;
                    });

                    listaHuecosContenedor.innerHTML = '';

                    if (turnosLibresReales.length === 0) {
                        listaHuecosContenedor.innerHTML = '<p style="font-size:0.9rem; color:var(--terracota-suave); font-style:italic;"><i class="fa-solid fa-calendar-xmark"></i> No quedan huecos libres para esta franja.</p>';
                        return;
                    }

                    // 5. Pintamos las píldoras reales y limpias
                    turnosLibresReales.forEach(hora => {
                        const pildora = document.createElement('button');
                        pildora.type = 'button';
                        pildora.className = 'pildora-hora-libre';
                        pildora.innerHTML = `<i class="fa-regular fa-clock"></i> ${hora}`;
                        pildora.addEventListener('click', () => {
                            const inputHoraForm = document.getElementById('cita-hora');
                            if (inputHoraForm) inputHoraForm.value = hora;
                            panelHuecos.classList.remove('abierto');
                        });
                        listaHuecosContenedor.appendChild(pildora);
                    });

                } catch (err) {
                    console.error("Error al calcular huecos libres:", err);
                    listaHuecosContenedor.innerHTML = '<p style="font-size:0.9rem; color:red;">Error al cargar la disponibilidad.</p>';
                }
            });
        });;
    }
});
