// ==========================================================================
// 1. CONFIGURACIÓN Y CONEXIÓN CON LA BASE DE DATOS CLOUD (SUPABASE)
// ==========================================================================
// Definimos las credenciales públicas del proyecto en Supabase para saber a dónde apuntar.
const SUPABASE_URL = "https://oxjqhyyxaygugwtykrod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_F7gjljAey0RdnDdvaoiA-g_I_P3-qCH";

// Inicializamos el cliente global. Este objeto "supabaseClient" contiene todos los métodos
// necesarios (.from, .select, .insert...) para hablar con la base de datos PostgreSQL.
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Todo el código se ejecuta obligatoriamente cuando el navegador ha terminado de cargar el HTML
document.addEventListener('DOMContentLoaded', () => {

    // ==========================================================================
    // 2. CONTROL ANIMADO DEL LOGO (Efecto visual del Feed de Instagram)
    // ==========================================================================
    const logo = document.querySelector('.logo-aiire');
    if (logo) {
        // Al pasar el ratón, añade la clase CSS ".activo" para ordenar las letras y cambiar el color
        logo.addEventListener('mouseenter', () => { logo.classList.add('activo'); });
        // Al quitar el ratón, quita la clase para que vuelvan a su posición original desalineada
        logo.addEventListener('mouseleave', () => { logo.classList.remove('activo'); });
    }

    // ==========================================================================
    // 3. LIMITACIÓN DINÁMICA DE FECHAS EN EL CALENDARIO DEL FORMULARIO
    // ==========================================================================
    const inputFecha = document.getElementById('cita-fecha');
    if (inputFecha) {
        const hoy = new Date();
        const añoMin = hoy.getFullYear();
        // Agregamos un cero a la izquierda si el mes o día es menor a 10 para cumplir el formato YYYY-MM-DD
        const mesMin = String(hoy.getMonth() + 1).padStart(2, '0');
        const diaMin = String(hoy.getDate()).padStart(2, '0');

        // Bloqueamos el calendario para que no se puedan seleccionar fechas del pasado
        inputFecha.min = `${añoMin}-${mesMin}-${diaMin}`;

        // Ponemos un límite lejano en el futuro (10 años máximo) para evitar errores del usuario
        const añoMax = añoMin + 10;
        inputFecha.max = `${añoMax}-12-31`;
    }

    // ==========================================================================
    // 4. CAPTURA DE PARÁMETROS URL (Para enlazar la Agenda con el Formulario)
    // ==========================================================================
    // Si vienes desde la agenda haciendo click en un hueco libre, la URL tendrá datos (ej: ?hora=09:00)
    const parametrosURL = new URLSearchParams(window.location.search);
    if (parametrosURL.has('hora')) {
        const inputHora = document.getElementById('cita-hora');
        // Si el parámetro existe, auto-rellenamos el campo de la hora en el formulario automáticamente
        if (inputHora) inputHora.value = parametrosURL.get('hora');
    }

    // ==========================================================================
    // 5. ESCUDO ANTI-INCONSISTENCIA: AUTOCOMPLETADO Y BLOQUEO POR DNI
    // ==========================================================================
    const inputDni = document.getElementById('paciente-dni');
    const inputNombre = document.getElementById('paciente-nombre');
    const inputTelefono = document.getElementById('paciente-telefono');
    const btnEditarPaciente = document.getElementById('btn-editar-paciente-existe');

    if (inputDni) {
        // Formateador en tiempo real: Limpia espacios, guiones y fuerza mayúsculas mientras el usuario teclea
        inputDni.addEventListener('input', () => {
            inputDni.value = inputDni.value.toUpperCase().replace(/[\s-]/g, '');
        });

        // Este evento salta cuando el usuario termina de escribir el DNI y sale del cuadro (pierde el foco)
        inputDni.addEventListener('change', async () => {
            const dniBuscar = inputDni.value.trim().toUpperCase();
            if (dniBuscar.length < 5) return; // Si es un texto muy corto, cancelamos la petición para no saturar la API

            try {
                // Hacemos una consulta SELECT a la tabla "pacientes" buscando una coincidencia exacta de DNI
                const { data: paciente, error } = await supabaseClient
                    .from('pacientes')
                    .select('nombre, pr_apellido, sg_apellido, telefono')
                    .eq('dni', dniBuscar)
                    .maybeSingle(); // Si no encuentra nada, devuelve null de forma segura en vez de lanzar un error genérico

                if (error) throw error;

                if (paciente) {
                    // ¡EL PACIENTE YA EXISTE EN LA CLÍNICA!
                    // Reconstruimos su nombre completo combinando los apellidos almacenados
                    const apellido2 = paciente.sg_apellido ? ` ${paciente.sg_apellido}` : '';
                    inputNombre.value = `${paciente.nombre} ${paciente.pr_apellido}${apellido2}`.trim();
                    inputTelefono.value = paciente.telefono;

                    // Bloqueamos los inputs en modo "Solo lectura" para evitar erratas accidentales del recepcionista
                    inputNombre.readOnly = true;
                    inputTelefono.readOnly = true;

                    // Mostramos el botón subrayado por si de verdad se quiere modificar la ficha del paciente
                    if (btnEditarPaciente) btnEditarPaciente.classList.remove('oculto');
                    console.log(`🎯 Paciente veterano detectado: ${inputNombre.value}`);
                } else {
                    // EL PACIENTE ES NUEVO: Aseguramos que los campos estén desbloqueados para poder escribir a mano
                    inputNombre.readOnly = false;
                    inputTelefono.readOnly = false;
                    if (btnEditarPaciente) btnEditarPaciente.classList.add('oculto');
                }

            } catch (err) {
                console.error("Error al verificar el DNI:", err);
            }
        });
    }

    // Si el recepcionista pulsa el botón de auxilio para modificar los datos del paciente antiguo:
    if (btnEditarPaciente) {
        btnEditarPaciente.addEventListener('click', () => {
            inputNombre.readOnly = false; // Desbloqueamos los campos
            inputTelefono.readOnly = false;
            inputNombre.focus(); // Ponemos el cursor directamente en el campo del nombre
            alert("⚠️ Estás editando la ficha global del paciente. Al guardar la cita, se actualizarán sus datos en el historial.");
        });
    }

    // ==========================================================================
    // 6. PROCESAMIENTO DEL FORMULARIO: VALIDACIÓN Y GUARDADO DE CITAS
    // ==========================================================================
    const formulario = document.getElementById('form-gestion-cita');

    if (formulario) {
        formulario.addEventListener('submit', async (e) => {
            e.preventDefault(); // Frenamos el recargo de página automático que tienen los formularios por defecto

            // Capturamos todos los valores introducidos en el formulario
            const nombreCompleto = document.getElementById('paciente-nombre').value.trim();
            const dniInput = document.getElementById('paciente-dni').value.trim().toUpperCase();
            const telefono = document.getElementById('paciente-telefono').value.trim();
            const fecha = document.getElementById('cita-fecha').value;
            const hora = document.getElementById('cita-hora').value;
            const fisioSeleccionada = document.getElementById('cita-fisio').value;
            const tratamiento = document.getElementById('cita-servicio').value;
            const notas = document.getElementById('cita-notas').value.trim();

            // ALGORITMO DE TROCEO: Separamos el Nombre Completo por espacios para encajarlo en el esquema de la tabla SQL
            const partesNombre = nombreCompleto.split(' ');
            const nombre = partesNombre[0] || 'Sin nombre';
            const pr_apellido = partesNombre[1] || 'Sin Apellido';
            const sg_apellido = partesNombre.slice(2).join(' ') || null; // El resto de palabras se unen en el segundo apellido

            // Mapeamos los textos del frontend a los IDs numéricos enteros requeridos por la base de datos
            const idProfesional = (fisioSeleccionada === 'maria_rosa') ? 1 : 2;
            const fechaHoraTimestamp = `${fecha} ${hora}:00`; // Construimos el formato TIMESTAMP válido para PostgreSQL

            try {
                // --- ESCUDO 0: EVITAR CITAS DUPLICADAS (PISADOS EN TIEMPO REAL) ---
                // Consultamos si esa fisioterapeuta en concreto ya tiene una cita agendada a esa misma fecha y hora
                const { data: citaDuplicada, error: errorValidacion } = await supabaseClient
                    .from('citas')
                    .select('id')
                    .eq('fecha_hora', fechaHoraTimestamp)
                    .eq('id_profesional', idProfesional)
                    .maybeSingle();

                if (errorValidacion) throw errorValidacion;

                // Si la consulta nos devuelve algo, significa que el hueco se ha ocupado hace segundos. Frenamos en seco.
                if (citaDuplicada) {
                    alert(`🚨 ¡Ojo! Esa hora ya está ocupada para la fisioterapeuta seleccionada. Elige otro hueco.`);
                    return; // Terminamos la ejecución de la función inmediatamente, haciendo un "un-commit" lógico
                }

                // --- ESCUDO A: CONTROL DE LA TABLA PACIENTES ---
                // Comprobamos si el DNI ya tiene una fila creada en la tabla pacientes
                const { data: pacienteExistente, error: errorBusqueda } = await supabaseClient
                    .from('pacientes')
                    .select('dni')
                    .eq('dni', dniInput)
                    .maybeSingle();

                if (errorBusqueda) throw errorBusqueda;

                if (!pacienteExistente) {
                    // CASO NUEVO: Insertamos una nueva fila en la tabla "pacientes"
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
                    // CASO EXISTENTE: Ejecutamos un UPDATE para actualizar sus datos por si cambiaron de teléfono o nombre
                    const { error: errorUpdatePaciente } = await supabaseClient
                        .from('pacientes')
                        .update({
                            nombre: nombre,
                            pr_apellido: pr_apellido,
                            sg_apellido: sg_apellido,
                            telefono: telefono
                        })
                        .eq('dni', dniInput);

                    if (errorUpdatePaciente) throw errorUpdatePaciente;
                    console.log(`🔄 Ficha del paciente [${dniInput}] actualizada en el historial.`);
                }

                // --- ESCUDO B: INSERCIÓN EN LA TABLA CITAS ---
                // Una vez guardado o actualizado el paciente, insertamos la cita vinculada mediante la clave foránea "dni_paciente"
                const { error: errorInsertCita } = await supabaseClient
                    .from('citas')
                    .insert([{
                        dni_paciente: dniInput,
                        id_profesional: idProfesional,
                        fecha_hora: fechaHoraTimestamp,
                        id_sala: 1, // Por defecto asignamos sala de tratamiento 1
                        duracion: 60, // Duración estandarizada en 60 minutos
                        observaciones: notas
                    }]);

                if (errorInsertCita) throw errorInsertCita;

                // ÉXITO TOTAL: Informamos al usuario, limpiamos el formulario y restauramos los bloqueos de inputs
                alert(`¡Cita guardada con éxito en la nube para ${nombreCompleto}!`);
                formulario.reset();
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
    // 7. BOTÓN DE LIMPIAR FORMULARIO (Optimizado para usabilidad móvil)
    // ==========================================================================
    const btnLimpiar = document.getElementById('btn-cancelar-edicion');

    if (btnLimpiar && formulario) {
        btnLimpiar.addEventListener('click', () => {
            formulario.reset(); // Resetea todos los campos nativos del HTML
            if (inputNombre) inputNombre.readOnly = false; // Desbloquea campos por si estaban en modo readonly
            if (inputTelefono) inputTelefono.readOnly = false;
            if (btnEditarPaciente) btnEditarPaciente.classList.add('oculto'); // Oculta el botón secundario de edición
            console.log("🧹 Formulario reseteado por el usuario.");
        });
    }

    // ==========================================================================
    // 8. LÓGICA DEL BUSCADOR DE HUECOS LIBRES EXPRESS (Algoritmo Inteligente)
    // ==========================================================================
    const btnDesplegar = document.getElementById('btn-desplegar-huecos');
    const panelHuecos = document.getElementById('wrapper-buscador-huecos');
    const listaHuecosContenedor = document.getElementById('lista-huecos-libres');
    const botonesFranja = document.querySelectorAll('.btn-franja');

    // Nuestro array maestro estático con todas las horas disponibles de la jornada laboral de la clínica
    const turnosTotales = ["09:00", "10:00", "11:00", "12:00", "13:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

    if (btnDesplegar && panelHuecos) {
        // Abre o cierra el panel con un efecto persiana gestionado por transiciones CSS
        btnDesplegar.addEventListener('click', () => {
            panelHuecos.classList.toggle('abierto');
            listaHuecosContenedor.innerHTML = '';
            botonesFranja.forEach(b => b.classList.remove('activo'));
        });

        botonesFranja.forEach(boton => {
            boton.addEventListener('click', async () => {
                const fechaSeleccionada = inputFecha ? inputFecha.value : '';

                // Control preventivo: Si no hay fecha elegida en el calendario, bloqueamos la consulta
                if (!fechaSeleccionada) {
                    alert("⚠️ Por favor, selecciona primero una fecha en el calendario para buscar huecos libres.");
                    return;
                }

                // Gestión de estados activos en los botones (estilo visual)
                botonesFranja.forEach(b => b.classList.remove('activo'));
                boton.classList.add('activo');

                // Metemos un texto temporal con un spinner giratorio para mejorar el feedback de carga (asincronía)
                listaHuecosContenedor.innerHTML = '<p style="font-size:0.9rem; color:#666;"><i class="fa-solid fa-spinner fa-spin"></i> Consultando disponibilidad...</p>';

                try {
                    // PASO 1: Viajamos a la nube de Supabase para descargar las citas de la fecha seleccionada
                    const { data: citasDelDia, error } = await supabaseClient
                        .from('citas')
                        .select('fecha_hora, id_profesional')
                        .gte('fecha_hora', `${fechaSeleccionada} 00:00:00`)
                        .lte('fecha_hora', `${fechaSeleccionada} 23:59:59`);

                    if (error) throw error;

                    // PASO 2: Creamos un mapa/diccionario de ocupación horaria.
                    // Contamos cuántas citas hay por cada tramo de hora exacto.
                    const ocupacionPorHora = {};
                    citasDelDia.forEach(c => {
                        const horaCita = c.fecha_hora.split(' ')[1].substring(0, 5); // Troceamos "YYYY-MM-DD HH:MM:SS" para quedarnos con "HH:MM"
                        ocupacionPorHora[horaCita] = (ocupacionPorHora[horaCita] || 0) + 1; // Incrementamos el contador de esa hora
                    });

                    // PASO 3: Filtramos el array maestro inicial según la franja horaria elegida (Mañana, Tarde o Todo el día)
                    const franja = boton.getAttribute('data-franja');
                    let turnosFiltrados = (franja === 'manana') ? turnosTotales.filter(t => t < "14:00") :
                                          (franja === 'tarde') ? turnosTotales.filter(t => t >= "14:00") : [...turnosTotales];

                    // PASO 4: ALGORITMO FILTRADOR DE HUECOS REALES.
                    // Si una hora tiene un contador mayor o igual a 2, significa que tanto María Rosa como Alba están ocupadas a esa hora.
                    // Por lo tanto, si la ocupación es menor a 2, ¡al menos una de las dos tiene un hueco disponible!
                    let turnosLibresReales = turnosFiltrados.filter(hora => {
                        return (ocupacionPorHora[hora] || 0) < 2;
                    });

                    listaHuecosContenedor.innerHTML = ''; // Limpiamos el texto de carga anterior

                    // Si tras filtrar no queda ningún hueco libre, pintamos un mensaje de alerta suave
                    if (turnosLibresReales.length === 0) {
                        listaHuecosContenedor.innerHTML = '<p style="font-size:0.9rem; color:var(--terracota-suave); font-style:italic;"><i class="fa-solid fa-calendar-xmark"></i> No quedan huecos libres para esta franja.</p>';
                        return;
                    }

                    // PASO 5: RENDERIZACIÓN DINÁMICA. Generamos un botón/píldora HTML por cada hora libre real calculada.
                    turnosLibresReales.forEach(hora => {
                        const pildora = document.createElement('button');
                        pildora.type = 'button';
                        pildora.className = 'pildora-hora-libre';
                        pildora.innerHTML = `<i class="fa-regular fa-clock"></i> ${hora}`;

                        // Si el recepcionista hace click en una píldora, inyectamos ese valor en el input nativo de la hora y cerramos el panel
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
        });
    }
});
