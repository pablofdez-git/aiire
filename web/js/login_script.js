const SUPABASE_URL = "https://oxjqhyyxaygugwtykrod.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_F7gjljAey0RdnDdvaoiA-g_I_P3-qCH";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('form-login');
    const errorMsg = document.getElementById('login-error-msg');

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;

            try {
                // Llamamos al método nativo de autenticación de Supabase
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) throw error;

                // Si todo va bien, Supabase guarda la sesión automáticamente en el LocalStorage.
                // Redirigimos al usuario a la pantalla de inicio (Nueva Cita)
                console.log("🔓 Sesión iniciada con éxito:", data.user.email);
                window.location.href = "../index.html";

            } catch (err) {
                console.error("Error en el login:", err.message);
                if (errorMsg) {
                    errorMsg.textContent = "❌ Correo o contraseña incorrectos.";
                    errorMsg.classList.remove('oculto');
                }
            }
        });
    }
});
