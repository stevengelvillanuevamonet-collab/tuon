import { fromBase64, toBase64 } from "lib0/buffer";

export const toB64 = (bytes: Uint8Array) => toBase64(bytes);
export const fromB64 = (text: string) => fromBase64(text);

/** Transaction origins that are not "the person typing", so they never trigger an autosave. */
export const LOAD_ORIGIN = "tuon-load";
export const SEED_ORIGIN = "tuon-seed";

/** The Yjs field the editor's document lives in (Tiptap's default). */
export const FIELD = "default";

/**
 * Every browser that converts the same legacy note into a shared document must produce the *same* Yjs structure,
 * otherwise two people opening an old note at once would each insert a copy of it. A fixed client id makes the
 * conversion deterministic, so merging the copies is a no-op.
 */
export const SEED_CLIENT_ID = 0x7e5eed;
