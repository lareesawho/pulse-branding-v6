/* Offline mirror: Framer owner-only editor bar stubbed out.
 * The real module renders a hidden owner-only iframe and calls api.framer.com; it never
 * affects what a visitor sees, so the mirror replaces it with an inert component.
 * script_main.mjs does: `let {createEditorBar} = await import("https://framer.com/edit/init.mjs");
 *                        return {default: createEditorBar()}` — so both exports must exist. */
export function createEditorBar() { return function EditorBarOffline() { return null; }; }
export default function EditorBarOffline() { return null; }
