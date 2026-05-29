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
})();
