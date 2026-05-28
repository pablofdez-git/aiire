document.addEventListener('DOMContentLoaded', () => {

    // ==========================================================================
    // 1. EFECTO SCROLL EN EL HEADER
    // ==========================================================================
    const header = document.querySelector('header');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('header-scroll');
        } else {
            header.classList.remove('header-scroll');
        }
    });

    // ==========================================================================
    // 2. ANIMACIÓN SECUENCIAL DEL LOGO (Efecto Ola)
    // ==========================================================================
    const letras = document.querySelectorAll('.logo-aiire span');
    const logoContainer = document.querySelector('.logo-aiire');

    if (logoContainer) {
        logoContainer.addEventListener('mouseenter', () => {
            letras.forEach((letra, index) => {
                setTimeout(() => {
                    letra.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), color 0.3s';
                    letra.style.transform += ' scale(1.15)';
                    letra.style.color = 'var(--terracota-suave)';
                }, index * 50);
            });
        });

        logoContainer.addEventListener('mouseleave', () => {
            letras.forEach((letra) => {
                letra.style.color = '';
                letra.style.transform = '';
            });
        });
    }

    // ==========================================================================
    // 3. ANIMACIÓN SUAVE EN EL ACORDEÓN DE PREGUNTAS (FAQ)
    // ==========================================================================
    const detalles = document.querySelectorAll('details');

    detalles.forEach((detail) => {
        const summary = detail.querySelector('summary');
        const respuesta = detail.querySelector('p');

        if (summary && respuesta) {
            summary.addEventListener('click', (e) => {
                e.preventDefault();

                if (detail.hasAttribute('open')) {
                    respuesta.style.height = '0px';
                    respuesta.style.opacity = '0';
                    respuesta.style.marginTop = '0px';

                    setTimeout(() => {
                        detail.removeAttribute('open');
                    }, 300);
                } else {
                    detail.setAttribute('open', '');
                    respuesta.style.height = '0px';
                    respuesta.style.opacity = '0';

                    const alturaReal = respuesta.scrollHeight + 'px';

                    setTimeout(() => {
                        respuesta.style.marginTop = '15px';
                        respuesta.style.height = alturaReal;
                        respuesta.style.opacity = '1';
                    }, 10);
                }
            });
        }
    });

    // ==========================================================================
    // 4. EFECTO MAGNÉTICO EN BOTONES PRINCIPALES
    // ==========================================================================
    const botonesMagneticos = document.querySelectorAll('.btn-cita, .btn-hero-cita');

    botonesMagneticos.forEach((btn) => {
        btn.addEventListener('mousemove', (e) => {
            const boundBox = btn.getBoundingClientRect();
            const mouseX = e.clientX - boundBox.left - boundBox.width / 2;
            const mouseY = e.clientY - boundBox.top - boundBox.height / 2;

            btn.style.transform = `translate(${mouseX * 0.3}px, ${mouseY * 0.3}px) scale(1.02)`;
            btn.style.transition = 'transform 0.1s ease-out';
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
            btn.style.transition = 'transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        });
    });

    // ==========================================================================
    // 5. VALIDACIÓN INTERACTIVA DEL FORMULARIO
    // ==========================================================================
    const formulario = document.querySelector('.form-box form');

    if (formulario) {
        formulario.addEventListener('submit', (e) => {
            e.preventDefault();

            const nombre = formulario.querySelector('input[type="text"]').value.trim();
            const telefono = formulario.querySelector('input[type="tel"]').value.trim();
            const fecha = formulario.querySelector('input[type="date"]').value;

            if (nombre.length < 3) {
                alert('Por favor, introduce un nombre válido.');
                return;
            }

            if (!/^\d{9}$/.test(telefono.replace(/\s/g, ''))) {
                alert('El teléfono debe tener 9 dígitos numéricos.');
                return;
            }

            alert(`¡Perfecto, ${nombre}! Hemos recibido tu solicitud para el día ${fecha}. Nos pondremos en contacto contigo en el teléfono ${telefono}.`);
            formulario.reset();
        });
    }
});
