// 1. INICIALIZAMOS EL CLIENTE DE SUPABASE PARA ESTA PÁGINA
const SUPABASE_URL = "https://oxjqhyyxaygugwtykrod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_F7gjljAey0RdnDdvaoiA-g_I_P3-qCH";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {

    // Vínculos de las estadísticas
    const statPacientes = document.getElementById('stat-total-pacientes');
    const statCitasSemana = document.getElementById('stat-citas-semana');
    const statServicioEstrella = document.getElementById('stat-servicio-estrella');

    // Vínculo del formulario de registro
    const formRegistro = document.getElementById('form-registro-personal');

    // Vínculo del Monitor de Auditoría
    const contenedorAuditoria = document.getElementById('lista-auditoria');

    // ==========================================================================
    // 1. CARGA DEL CUADRO DE MANDOS EXPRESS (DATOS REALES DE SUPABASE)
    // ==========================================================================
    async function calcularEstadisticas() {
        try {
            // A. Contamos el total de pacientes reales en la base de datos
            const { count: totalPacientes, error: errorP } = await supabaseClient
                .from('pacientes')
                .select('*', { count: 'exact', head: true });

            if (errorP) throw errorP;
            if (statPacientes) statPacientes.textContent = totalPacientes || 0;

            // B. Calculamos el rango de la semana actual (Lunes a Domingo)
            const hoy = new Date();
            const inicioSemana = new Date(hoy);
            inicioSemana.setDate(hoy.getDate() - (hoy.getDay() === 0 ? 6 : hoy.getDay() - 1));
            inicioSemana.setHours(0,0,0,0);

            const finSemana = new Date(inicioSemana);
            finSemana.setDate(inicioSemana.getDate() + 6);
            finSemana.setHours(23,59,59,999);

            const formatISO = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

            // Consultamos las citas de la semana en la tabla
            const { data: citasSemana, error: errorC } = await supabaseClient
                .from('citas')
                .select('observaciones')
                .gte('fecha_hora', `${formatISO(inicioSemana)} 00:00:00`)
                .lte('fecha_hora', `${formatISO(finSemana)} 23:59:59`);

            if (errorC) throw errorC;
            if (statCitasSemana) statCitasSemana.textContent = citasSemana.length || 0;

            // C. Tratamiento Estrella real basado en las observaciones de las citas de la semana
            if (citasSemana && citasSemana.length > 0) {
                const recuentoServicios = {};
                citasSemana.forEach(c => {
                    const servicio = c.observaciones ? c.observaciones.trim() : "Fisioterapia General";
                    recuentoServicios[servicio] = (recuentoServicios[servicio] || 0) + 1;
                });

                let servicioMasBuscado = "Fisioterapia General";
                let maxVotos = 0;

                for (const key in recuentoServicios) {
                    if (recuentoServicios[key] > maxVotos) {
                        maxVotos = recuentoServicios[key];
                        servicioMasBuscado = key;
                    }
                }
                if (statServicioEstrella) statServicioEstrella.textContent = servicioMasBuscado;
            } else {
                if (statServicioEstrella) statServicioEstrella.textContent = "Sin citas esta semana";
            }

        } catch (err) {
            console.error("Error en las estadísticas:", err.message);
        }
    }

    // ==========================================================================
    // 2. MONITOR DE AUDITORÍA REAL (ÚLTIMAS CITAS REGISTRADAS EN LA BD)
    // ==========================================================================
    async function cargarMonitorAuditoriaReal() {
        if (!contenedorAuditoria) return;

        try {
            // Hacemos un inner join rápido para traer las últimas 5 citas creadas,
            // ordenadas por ID descendente, incluyendo los nombres de los pacientes.
            const { data: ultimasCitas, error } = await supabaseClient
                .from('citas')
                .select(`
                    id,
                    fecha_hora,
                    id_profesional,
                    pacientes (nombre, pr_apellido)
                `)
                .order('id', { ascending: false })
                .limit(5);

            if (error) throw error;

            contenedorAuditoria.innerHTML = '';

            if (!ultimasCitas || ultimasCitas.length === 0) {
                contenedorAuditoria.innerHTML = '<li class="log-vacio">No hay registros de citas en la base de datos.</li>';
                return;
            }

            // Pintamos los logs reales en el feed
            ultimasCitas.forEach(cita => {
                const li = document.createElement('li');
                li.className = 'log-item log-item-create';

                const profesional = cita.id_profesional === 1 ? "María Rosa" : "Alba Rojo";
                const pac = cita.pacientes;
                const nombrePaciente = pac ? `${pac.nombre} ${pac.pr_apellido}` : "Paciente";

                // Formateamos la visualización del timestamp de la cita
                const fechaCitaClean = cita.fecha_hora.replace('T', ' ').substring(0, 16);

                li.innerHTML = `
                    <span class="log-timestamp">Cita ID: #${cita.id}</span>
                    Sistema detectó nueva cita programada para <span class="log-usuario">${nombrePaciente}</span> con la especialista <strong>${profesional}</strong> el día ${fechaCitaClean}h.
                `;
                contenedorAuditoria.appendChild(li);
            });

        } catch (err) {
            console.error("Error cargando auditoría real:", err.message);
            contenedorAuditoria.innerHTML = '<li class="log-vacio">❌ Error al conectar con el feed de auditoría.</li>';
        }
    }

    // ==========================================================================
    // 3. LOGICA DE REGISTRO DE NUEVOS USUARIOS
    // ==========================================================================
    if (formRegistro) {
        formRegistro.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;
            const roleElegido = document.getElementById('reg-role').value;

            try {
                const { data, error } = await supabaseClient.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            role: roleElegido,
                            email_verified: true
                        }
                    }
                });

                if (error) throw error;

                alert(`🎉 Cuenta creada en la nube para: ${email} con rol [${roleElegido}].`);
                formRegistro.reset();

                // Refrescamos todo al instante
                calcularEstadisticas();
                cargarMonitorAuditoriaReal();

            } catch (err) {
                console.error("Error al registrar:", err.message);
                alert("Error al dar de alta: " + err.message);
            }
        });
    }

    // Carga inicial al entrar
    calcularEstadisticas();
    cargarMonitorAuditoriaReal();
    // Ejecuta la función de actualizar los contadores automáticamente cada 5.000 milisegundos (5 segundos)
    setInterval(calcularEstadisticas, 5000);
});
