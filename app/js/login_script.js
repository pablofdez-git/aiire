// 1. INICIALIZAMOS EL CLIENTE DE SUPABASE PARA ESTA PÁGINA
const SUPABASE_URL = "https://oxjqhyyxaygugwtykrod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_F7gjljAey0RdnDdvaoiA-g_I_P3-qCH";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    // Vinculamos los elementos reales del HTML del Login
    const formLogin = document.getElementById('form-login-sistema');
    const togglePassword = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('reg-password');

    // Creamos de forma dinámica el contenedor de error si hiciese falta
    let errorMsg = document.getElementById('login-error-msg');

    // ==========================================================================
    // 1. LÓGICA DEL BOTÓN DEL OJO (VER/OCULTAR CONTRASEÑA)
    // ==========================================================================
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            // Alternamos el tipo de input entre 'password' y 'text'
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            // Cambiamos el icono del ojo (abierto / tachado) con FontAwesome
            togglePassword.classList.toggle('fa-eye');
            togglePassword.classList.toggle('fa-eye-slash');
        });
    }

    // ==========================================================================
    // 2. PROCESO DE AUTENTICACIÓN (LOGIN) REAL CON SUPABASE
    // ==========================================================================
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evitamos que la página se recargue y rompa el JS

            const email = document.getElementById('reg-email').value.trim();
            const password = passwordInput ? passwordInput.value : '';

            try {
                // Llamamos al método nativo de autenticación de Supabase
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) throw error;

                // Si todo va bien, guardamos log y redirigimos al index externo
                console.log("🔓 Sesión iniciada con éxito:", data.user.email);

                // Reseteamos el ojo a modo oculto antes de marchar por seguridad
                if (passwordInput) passwordInput.setAttribute('type', 'password');

                window.location.href = "../index.html";

            } catch (err) {
                console.error("Error en el login:", err.message);

                // Si falla, avisamos con un alert directo en pantalla para que se entere el usuario
                alert("❌ Correo electrónico o contraseña incorrectos. Inténtalo de nuevo.");

                // 💥 LA MAGIA: Vaciamos el campo de la contraseña automáticamente tras el fallo
                if (passwordInput) {
                    passwordInput.value = ""; // Borra los caracteres erróneos
                    passwordInput.focus();     // Devuelve el cursor parpadeando listo para escribir
                }
            }
        });
    }
});
