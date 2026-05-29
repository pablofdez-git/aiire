(async () => {
    const urlSupabase = "https://oxjqhyyxaygugwtykrod.supabase.co";
    const keyAnonSupabase = "sb_publishable_F7gjljAey0RdnDdvaoiA-g_I_P3-qCH";
    const clientAuth = supabase.createClient(urlSupabase, keyAnonSupabase);

    // Comprobamos si hay sesión en el navegador
    const { data: { user } } = await clientAuth.auth.getUser();

    // 🚨 SI NO HAY USUARIO LOGUEADO: Lo echamos al login
    if (!user) {
        console.log("🚨 Acceso denegado. Redirigiendo al login...");

        // Evaluamos dónde está el usuario según la URL del navegador
        if (window.location.pathname.includes('/html/')) {
            // Si está dentro de la carpeta html (ej: agenda.html), el login está en su misma carpeta
            window.location.href = "login.html";
        } else {
            // Si está en la raíz (index.html), el login está dentro de html/
            window.location.href = "html/login.html";
        }
        return;
    }

    // 🔑 SI HAY USUARIO LOGUEADO PERO INTENTA ENTRAR A LOGIN.HTML: Lo sacamos de ahí
    if (window.location.pathname.includes('login.html')) {
        console.log("🔓 Ya estás logueado. Redirigiendo al inicio...");
        window.location.href = "../index.html";
    }

    // 🔥 CONTROL DE VISIBILIDAD DE LA PESTAÑA ADMIN EN EL MENÚ PRESET
    // Ejecutamos este chequeo cuando el DOM ya se ha pintado para poder manipular el menú
    window.addEventListener('DOMContentLoaded', () => {
        const botonNavAdmin = document.getElementById('nav-admin');
        const rolUsuario = user.user_metadata?.role;

        // Si el usuario registrado NO es un administrador del sistema:
        if (rolUsuario !== 'admin') {
            // 1. Si está intentando entrar físicamente a la página admin.html, le cortamos el paso
            if (window.location.pathname.includes('admin.html')) {
                alert("⛔ Acceso denegado: No tienes credenciales de administrador para gestionar el personal.");
                // Si está dentro de html/ sube para ir al index, si no se queda en index
                window.location.href = window.location.pathname.includes('/html/') ? "agenda.html" : "html/agenda.html";
            }
            // 2. Si está en cualquier otra pantalla, le escondemos el botón del menú para que ni lo vea
            if (botonNavAdmin) {
                botonNavAdmin.style.display = 'none';
            }
        }
    });

})();
