# aiire - Gestión de Citas en Tiempo Real 🍃

Intranet médica interactiva para la gestión de citas de fisioterapia de la clínica *aiire*. Conecta un front-end estático directamente con una base de datos PostgreSQL en la nube usando Supabase.

## 🚀 Características
* **Agenda Diaria:** Visualización de turnos horarios y estado de ocupación en tiempo real.
* **Escudo Anti-Pisados:** Control de integridad en el cliente que evita duplicar citas a la misma hora con la misma profesional.
* **Historial Clínico:** Buscador dinámico de pacientes por nombre, DNI o teléfono con soporte de filtrado acumulativo.
* **Recordatorios:** Integración con la API de WhatsApp para enviar mensajes de confirmación con un clic.

## 🛠️ Tecnologías utilizadas
* **Front-end:** HTML5, CSS3 Custom Properties (diseño adaptativo), JavaScript Nativo (ES6+).
* **Back-end as a Service (BaaS):** Supabase Client API.
* **Base de Datos:** PostgreSQL (alojado en la nube de Supabase).

## 📁 Estructura del repositorio
El repositorio contiene exclusivamente el entorno web estático para facilitar su despliegue continuo en producción (Vercel/Netlify). El backend pesado de gestión y las pruebas de arquitectura DAO/POJO en Java se administran en un entorno local independiente mediante Eclipse.
