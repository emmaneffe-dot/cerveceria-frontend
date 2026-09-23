// Dirección del backend (Spring Boot). La comparte Rodrigo cuando levanta su
// servidor local con Ngrok — si deja de andar, va a ser porque apagó el
// servidor de su lado o generó un link nuevo (Ngrok cambia la URL cada vez
// que se reinicia, salvo que tenga un dominio fijo contratado).
export const API_BASE_URL = 'https://script-riverbank-helpful.ngrok-free.dev';

// Las URLs gratuitas de Ngrok (como la de arriba) le muestran una "pantalla
// de aviso" a cualquier pedido que no traiga este header puntual, en vez de
// dejarlo pasar directo al backend. Por eso todos los fetch() de la app
// agregan este header — no hace falta tocarlo, solo usarlo en cada pedido
// (ver cómo se usa en index.tsx, catalogo.tsx y empleado.tsx).
export const HEADERS_NGROK = { 'ngrok-skip-browser-warning': 'true' };
