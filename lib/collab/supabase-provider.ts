import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness";
import { fromB64, toB64, LOAD_ORIGIN, SEED_ORIGIN } from "./encoding";

export type ProviderStatus = "connecting" | "connected" | "error" | "closed";

/** The slice of a Supabase Realtime channel the provider needs. Keeping it this small lets tests plug in a fake. */
export interface CollabChannel {
  on(type: "broadcast", filter: { event: string }, cb: (msg: { payload: unknown }) => void): CollabChannel;
  subscribe(cb: (status: string) => void): unknown;
  send(msg: { type: "broadcast"; event: string; payload: unknown }): unknown;
}

interface Options {
  doc: Y.Doc;
  channel: CollabChannel;
  /** Viewers receive everyone's edits and cursors but never send anything (the channel policy enforces this too). */
  readOnly?: boolean;
  /** Called on teardown so the owner can remove the channel. */
  onDestroy?: () => void;
}

// Realtime messages are capped in size and rate, so updates are chunked and batched.
const CHUNK_BYTES = 36_000;
const UPDATE_BATCH_MS = 70;
const AWARENESS_BATCH_MS = 110;

/**
 * Syncs a Yjs document between browsers over a Supabase Realtime broadcast channel, the way y-websocket would
 * over a socket server:
 *  - on connect, everyone swaps state vectors and sends each other whatever the other is missing,
 *  - after that, every local change is broadcast (batched) and applied by everyone else,
 *  - cursors and names travel through the Yjs awareness protocol.
 * The database snapshot (saved separately) is only for people arriving later. Nothing here needs a custom server.
 */
export class SupabaseYProvider {
  readonly doc: Y.Doc;
  readonly awareness: Awareness;
  status: ProviderStatus = "connecting";

  private channel: CollabChannel;
  private readOnly: boolean;
  private onDestroy?: () => void;
  private joined = false;
  private destroyed = false;
  private pendingUpdates: Uint8Array[] = [];
  private updateTimer: ReturnType<typeof setTimeout> | undefined;
  private pendingAwareness = new Set<number>();
  private awarenessTimer: ReturnType<typeof setTimeout> | undefined;
  private chunks = new Map<string, { n: number; parts: string[]; got: number }>();
  private statusListeners = new Set<(s: ProviderStatus) => void>();
  private unload = () => this.announceLeave();

  constructor({ doc, channel, readOnly = false, onDestroy }: Options) {
    this.doc = doc;
    this.channel = channel;
    this.readOnly = readOnly;
    this.onDestroy = onDestroy;
    this.awareness = new Awareness(doc);

    doc.on("update", this.onDocUpdate);
    this.awareness.on("update", this.onAwarenessUpdate);
    if (typeof window !== "undefined") window.addEventListener("pagehide", this.unload);

    for (const event of ["y-sync", "y-update", "y-awareness"]) {
      channel.on("broadcast", { event }, ({ payload }) => this.receive(event, payload as Record<string, unknown>));
    }
    channel.on("broadcast", { event: "y-chunk" }, ({ payload }) => this.receiveChunk(payload as Record<string, unknown>));
  }

  connect() {
    this.channel.subscribe((status) => {
      if (this.destroyed) return;
      if (status === "SUBSCRIBED") {
        this.joined = true;
        this.setStatus("connected");
        this.sendSync(false);
        this.queueAwareness([this.doc.clientID]);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        this.joined = false;
        this.setStatus("error");
      } else if (status === "CLOSED") {
        this.joined = false;
        this.setStatus(this.destroyed ? "closed" : "connecting");
      }
    });
  }

  onStatus(cb: (s: ProviderStatus) => void) {
    this.statusListeners.add(cb);
    return () => void this.statusListeners.delete(cb);
  }

  /** Tell everyone this cursor is gone (tab closing, navigating away). */
  announceLeave() {
    if (!this.joined) return;
    removeAwarenessStates(this.awareness, [this.doc.clientID], "leave");
    this.flushAwareness();
  }

  destroy() {
    if (this.destroyed) return;
    this.flushUpdates();
    this.announceLeave();
    this.destroyed = true;
    clearTimeout(this.updateTimer);
    clearTimeout(this.awarenessTimer);
    if (typeof window !== "undefined") window.removeEventListener("pagehide", this.unload);
    this.doc.off("update", this.onDocUpdate);
    this.awareness.off("update", this.onAwarenessUpdate);
    this.awareness.destroy();
    this.setStatus("closed");
    this.onDestroy?.();
  }

  // ── sending ──

  private setStatus(s: ProviderStatus) {
    if (this.status === s) return;
    this.status = s;
    this.statusListeners.forEach((cb) => cb(s));
  }

  private emit(event: string, payload: Record<string, unknown>) {
    if (!this.joined || this.readOnly) return; // viewers listen only
    void this.channel.send({ type: "broadcast", event, payload });
  }

  /** Big payloads are split into pieces and reassembled on the other side. */
  private emitBytes(event: string, key: string, bytes: Uint8Array, extra: Record<string, unknown> = {}) {
    if (bytes.length <= CHUNK_BYTES) return this.emit(event, { ...extra, [key]: toB64(bytes) });
    const id = `${this.doc.clientID}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const n = Math.ceil(bytes.length / CHUNK_BYTES);
    for (let i = 0; i < n; i++) {
      this.emit("y-chunk", { id, i, n, event, key, extra, d: toB64(bytes.subarray(i * CHUNK_BYTES, (i + 1) * CHUNK_BYTES)) });
    }
  }

  /** `reply` marks the answer to someone else's hello, so two peers don't greet each other forever. */
  private sendSync(reply: boolean) {
    this.emitBytes("y-sync", "sv", Y.encodeStateVector(this.doc), { reply });
  }

  private onDocUpdate = (update: Uint8Array, origin: unknown) => {
    if (origin === this || origin === SEED_ORIGIN || origin === LOAD_ORIGIN) return;
    this.pendingUpdates.push(update);
    if (!this.updateTimer) this.updateTimer = setTimeout(() => this.flushUpdates(), UPDATE_BATCH_MS);
  };

  private flushUpdates() {
    clearTimeout(this.updateTimer);
    this.updateTimer = undefined;
    if (!this.pendingUpdates.length) return;
    const merged = this.pendingUpdates.length === 1 ? this.pendingUpdates[0] : Y.mergeUpdates(this.pendingUpdates);
    this.pendingUpdates = [];
    this.emitBytes("y-update", "u", merged);
  }

  private onAwarenessUpdate = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
    if (origin === this) return; // came from someone else, don't echo it back
    this.queueAwareness([...added, ...updated, ...removed]);
  };

  private queueAwareness(ids: number[]) {
    ids.forEach((id) => this.pendingAwareness.add(id));
    if (!this.awarenessTimer) this.awarenessTimer = setTimeout(() => this.flushAwareness(), AWARENESS_BATCH_MS);
  }

  private flushAwareness() {
    clearTimeout(this.awarenessTimer);
    this.awarenessTimer = undefined;
    if (!this.pendingAwareness.size) return;
    const ids = [...this.pendingAwareness];
    this.pendingAwareness.clear();
    this.emitBytes("y-awareness", "a", encodeAwarenessUpdate(this.awareness, ids));
  }

  // ── receiving ──

  private receiveChunk(p: Record<string, unknown>) {
    const id = String(p.id);
    const n = Number(p.n);
    const entry = this.chunks.get(id) ?? { n, parts: new Array<string>(n), got: 0 };
    if (entry.parts[Number(p.i)] === undefined) {
      entry.parts[Number(p.i)] = String(p.d);
      entry.got++;
    }
    this.chunks.set(id, entry);
    if (entry.got < entry.n) return;
    this.chunks.delete(id);
    const bytes = entry.parts.map(fromB64);
    const whole = new Uint8Array(bytes.reduce((sum, b) => sum + b.length, 0));
    let at = 0;
    for (const b of bytes) {
      whole.set(b, at);
      at += b.length;
    }
    this.receive(String(p.event), { ...(p.extra as Record<string, unknown>), [String(p.key)]: toB64(whole) });
  }

  private receive(event: string, p: Record<string, unknown>) {
    if (this.destroyed) return;
    try {
      if (event === "y-update") {
        Y.applyUpdate(this.doc, fromB64(String(p.u)), this);
      } else if (event === "y-awareness") {
        applyAwarenessUpdate(this.awareness, fromB64(String(p.a)), this);
      } else if (event === "y-sync") {
        // Someone is catching up: send what they're missing. If it was a hello, say hello back so they can send us ours.
        const missing = Y.encodeStateAsUpdate(this.doc, fromB64(String(p.sv)));
        if (missing.length > 2) this.emitBytes("y-update", "u", missing);
        if (!p.reply) this.sendSync(true);
        this.queueAwareness([this.doc.clientID]);
      }
    } catch {
      // A malformed message from another client must never break this editor.
    }
  }
}
