document.addEventListener('DOMContentLoaded', () => {

    // Vinculamos los elementos de control de la interfaz del historial clínico
    const buscador = document.getElementById('buscador-pacientes');
    const tablaCompleta = document.querySelector('.tabla-historial');
    const cuerpoTabla = document.getElementById('cuerpo-tabla-pacientes');
    const mensajeNoResultados = document.getElementById('mensaje-no-resultados');
    const contadorPacientes = document.getElementById('num-pacientes');

    // Array maestro que almacena la copia exacta de todos los pacientes descargados de la nube
    let listaPacientesGlobal = [];

    // FUNCIÓN HELPER UTILIDAD: Normaliza el texto quitando tildes y diéresis de forma limpia.
    // Esto es vital para que si el usuario busca "maria" con minúscula y sin tilde, encuentre igualmente a "María"
    const eliminarTildes = (texto) => {
        return texto
            .normalize("NFD")               // Descompone los caracteres acentuados en sus letras base + sus tildes aisladas
            .replace(/[\u0300-\u036f]/g, ""); // Borra mediante Expresiones Regulares todos los símbolos de tildes aisladas
    };

    // ==========================================================================
    // 1. DESCARGA DEL HISTORIAL (Hereda el cliente de index_script de forma limpia)
    // ==========================================================================
    async function cargarHistorialDesdeNube() {
        try {
            // Lanzamos un SELECT completo a la tabla "pacientes" ordenado alfabéticamente por el primer apellido
            const { data: pacientes, error } = await supabaseClient
                .from('pacientes')
                .select('*')
                .order('pr_apellido', { ascending: true }); // Orden ascendente de la A a la Z

            if (error) throw error;

            // Almacenamos el resultado en nuestro array global de respaldo y disparamos la renderización
            listaPacientesGlobal = pacientes;
            renderizarTablaPacientes(listaPacientesGlobal);

        } catch (error) {
            console.error("Error al cargar el historial:", error);
        }
    }

    // ==========================================================================
    // 2. GENERACIÓN DINÁMICA DE FILAS DE LA TABLA PACIENTES
    // ==========================================================================
    function renderizarTablaPacientes(lista) {
        if (!cuerpoTabla) return;
        cuerpoTabla.innerHTML = ''; // Vaciamos la tabla por completo antes de remaquetar

        // Actualizamos el contador visual de la parte superior con el tamaño exacto de la lista actual
        if (contadorPacientes) contadorPacientes.textContent = lista.length;

        // CONTROL EXTRA: Si la lista de pacientes viene vacía (porque la base de datos está a cero o la búsqueda falló)
        if (lista.length === 0) {
            if (tablaCompleta) tablaCompleta.style.display = 'none'; // Escondemos los encabezados de la tabla
            if (mensajeNoResultados) mensajeNoResultados.classList.remove('oculto-busqueda'); // Mostramos el aviso de vacío
            return;
        }

        // Si hay pacientes, hacemos visible la tabla y ocultamos el mensaje de error de búsqueda
        if (tablaCompleta) tablaCompleta.style.display = 'table';
        if (mensajeNoResultados) mensajeNoResultados.classList.add('oculto-busqueda');

        // Bucle clásico: Generamos una fila `<tr>` por cada paciente que resida en la lista filtrada
        lista.forEach(p => {
            const fila = document.createElement('tr');
            fila.className = 'fila-paciente';

            // Combinamos el nombre y los dos apellidos de forma limpia controlando que el segundo no sea nulo
            const nombreCompleto = `${p.nombre} ${p.pr_apellido} ${p.sg_apellido || ''}`.trim();

            // Estructuramos las celdas de la fila inyectando los datos de las columnas SQL correspondientes
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
            cuerpoTabla.appendChild(fila); // Insertamos la fila dentro del cuerpo de la tabla
        });
    }

    // ==========================================================================
    // 3. BUSCADOR INTELIGENTE EN TIEMPO REAL (Filtro por teclado en el cliente)
    // ==========================================================================
    if (buscador) {
        // El evento "input" salta de forma instantánea cada vez que el usuario pulsa o borra una letra en el cuadro
        buscador.addEventListener('input', () => {
            // Normalizamos la cadena de búsqueda: quitamos espacios extras, la ponemos en minúsculas y eliminamos tildes
            const textoBusqueda = eliminarTildes(buscador.value.toLowerCase().trim());

            // Filtramos el array maestro sin tocar la base de datos de internet (Búsqueda ultrarrápida en memoria local)
            const pacientesFiltrados = listaPacientesGlobal.filter(p => {
                // Normalizamos los tres campos clave del objeto paciente para compararlos bajo las mismas reglas limpias
                const nombreCompleto = eliminarTildes(`${p.nombre} ${p.pr_apellido} ${p.sg_apellido || ''}`.toLowerCase());
                const dni = p.dni.toLowerCase();
                const telefono = p.telefono.toLowerCase();

                // CONDICIÓN LÓGICA: Si el texto introducido coincide con parte del nombre, del DNI o del teléfono, ¡se queda en la lista!
                return nombreCompleto.includes(textoBusqueda) ||
                       dni.includes(textoBusqueda) ||
                       telefono.includes(textoBusqueda);
            });

            // Volvemos a pintar la tabla usando el subconjunto de pacientes que han superado el filtro
            renderizarTablaPacientes(pacientesFiltrados);

            // CONTROL DE FRACASO: Si la búsqueda no ha arrojado ninguna coincidencia, alteramos el mensaje para avisar de forma específica
            if (pacientesFiltrados.length === 0 && mensajeNoResultados) {
                if (tablaCompleta) tablaCompleta.style.display = 'none';
                mensajeNoResultados.classList.remove('oculto-busqueda');
                mensajeNoResultados.innerHTML = `<i class="fa-solid fa-magnifying-glass-minus"></i> No se encontraron pacientes que coincidan con "${buscador.value}".`;
            }
        });
    }

    // Arrancamos el flujo de carga automático al abrir la pestaña del historial clínico
    cargarHistorialDesdeNube();
});
