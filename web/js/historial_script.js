document.addEventListener('DOMContentLoaded', () => {

    const buscador = document.getElementById('buscador-pacientes');
    const tablaCompleta = document.querySelector('.tabla-historial');
    const cuerpoTabla = document.getElementById('cuerpo-tabla-pacientes');
    const mensajeNoResultados = document.getElementById('mensaje-no-resultados');
    const contadorPacientes = document.getElementById('num-pacientes');

    let listaPacientesGlobal = [];

    const eliminarTildes = (texto) => {
        return texto
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    };

    // ==========================================================================
    // LEER PACIENTES (Hereda el cliente de index_script.js)
    // ==========================================================================
    async function cargarHistorialDesdeNube() {
        try {
            const { data: pacientes, error } = await supabaseClient
                .from('pacientes')
                .select('*')
                .order('pr_apellido', { ascending: true });

            if (error) throw error;

            listaPacientesGlobal = pacientes;
            renderizarTablaPacientes(listaPacientesGlobal);

        } catch (error) {
            console.error("Error al cargar el historial:", error);
        }
    }

    function renderizarTablaPacientes(lista) {
        if (!cuerpoTabla) return;
        cuerpoTabla.innerHTML = '';

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
            fila.className = 'fila-paciente';

            const nombreCompleto = `${p.nombre} ${p.pr_apellido} ${p.sg_apellido || ''}`.trim();

            fila.innerHTML = `
                <td class="td-nombre">${nombreCompleto}</td>
                <td class="td-dni">${p.dni}</td>
                <td class="td-tel">${p.telefono}</td>
                <td>
                    <div class="bloque-nota-historial">
                        <strong>Observaciones Clínicas:</strong>
                        ${p.notas_clinicas || 'Sin patologías ni anotaciones registradas en su ficha.'}
                    </div>
                </td>
            `;
            cuerpoTabla.appendChild(fila);
        });
    }

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

    cargarHistorialDesdeNube();
});
