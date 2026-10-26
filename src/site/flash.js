import { createFlashStore } from "../lib/flash.jsx";

/* flash(message, type, target) — same signature as the original core.js */
const store = createFlashStore({ ttl: 4200, fade: true, classFor: (type) => "flash flash-" + type });
export const siteFlashStore = store;
export function flash(message, type = "success", target = "flashStack") { store.flash(message, type, target); }
