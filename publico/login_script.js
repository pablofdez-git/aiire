document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('form-login');
    const inputPassword = document.getElementById('password');
    const btnVerPassword = document.getElementById('btn-ver-password');
    const mensajeError = document.getElementById('mensaje-error');

    // ==========================================================================
    // A. INTERRUPTOR PARA MOSTRAR/OCULTAR CONTRASEÑA
    // ==========================================================================
    btnVerPassword.addEventListener('click', () => {
        // Alternamos el tipo de input entre password y text
        if (inputPassword.type === 'password') {
            inputPassword.type = 'text';
            btnVerPassword.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
        } else {
            inputPassword.type = 'password';
            btnVerPassword.innerHTML = '<i class="fa-solid fa-eye"></i>';
        }
    });

    // ==========================================================================
    // B. CONTROL DEL ENVÍO DEL FORMULARIO (Simulación de sesión)
    // ==========================================================================
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault(); // Frenamos la recarga de página

        const usuario = document.getElementById('usuario').value.trim();
        const clave = inputPassword.value;

        // Credenciales quemadas de prueba (Fisios ficticios para simular el login)
        const usuarioValido = "admin";
        const claveValida = "1234";

        if (usuario === usuarioValido && clave === claveValida) {
            // Ocultamos errores previos si los hubiera
            mensajeError.className = "mensaje-error-oculto";

            // Simulación de almacenamiento de token de sesión (Muy útil en DAM)
            sessionStorage.setItem('sesionActiva', 'true');
            sessionStorage.setItem('nombreFisio', 'Pablo');

            // Redirigimos a la pantalla donde gestionarán las citas (la crearemos luego)
            window.location.href = "agenda.html";
        } else {
            // Mostramos el contenedor de error y aplicamos la animación shake del CSS
            mensajeError.className = "mensaje-error-visible";

            // Reiniciamos la animación por si vuelven a fallar seguidamente
            mensajeError.style.animation = 'none';
            mensajeError.offsetHeight; // Truco JS para forzar el reflow del navegador
            mensajeError.style.animation = '';
        }
    });
});
