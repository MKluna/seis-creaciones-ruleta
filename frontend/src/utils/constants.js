// ── Constantes globales del frontend ─────────────────────────────────────────
// Modificar aquí afecta toda la app sin tener que buscar valores dispersos.

// ── Ruleta: animación de giro ─────────────────────────────────────────────────
export const SPIN_DURATION_S   = 5.5;   // segundos del giro principal
export const SPIN_LAPS_MIN     = 5;     // vueltas mínimas antes de frenar
export const SPIN_LAPS_MAX     = 9;     // vueltas máximas (se elige al azar)
export const SPIN_BOUNCE_OUT   = 0.05;  // radianes de rebote hacia adelante
export const SPIN_BOUNCE_BACK  = 0.025; // radianes de rebote de regreso
export const IDLE_DURATION_S   = 18;    // segundos por vuelta completa en idle

// ── Ruleta: íconos Fluent Emoji ───────────────────────────────────────────────
export const ICON_RADIUS_RATIO = 0.58;  // fracción del radio donde se dibuja el ícono
export const ICON_CANVAS_DIV   = 12;    // tamaño = canvas.width / ICON_CANVAS_DIV
export const ICON_MIN_PX       = 22;    // tamaño mínimo en px
export const ICON_MAX_PX       = 44;    // tamaño máximo en px

// ── Botón GIRAR: partículas orbitantes ────────────────────────────────────────
export const BTN_PARTICLE_COUNT  = 38;  // cantidad de partículas en órbita
export const BTN_BURST_FRAMES    = 30;  // frames de expansión al hacer click
