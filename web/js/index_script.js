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
            boton.addEventListener('click', () => {
                botonesFranja.forEach(b => b.classList.remove('activo'));
                boton.classList.add('activo');

                const franja = boton.getAttribute('data-franja');
                let turnosFiltrados = (franja === 'manana') ? turnosTotales.filter(t => t < "14:00") :
                                      (franja === 'tarde') ? turnosTotales.filter(t => t >= "14:00") : [...turnosTotales];

                listaHuecosContenedor.innerHTML = '';
                turnosFiltrados.forEach(hora => {
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
            });
        });
    }
});
