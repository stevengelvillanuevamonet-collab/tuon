import { Editor } from "@tiptap/core";
import { prosemirrorToYXmlFragment } from "@tiptap/y-tiptap";
import * as Y from "yjs";
import { FIELD, SEED_CLIENT_ID } from "@/lib/collab/encoding";
import { buildExtensions, toDocHtml } from "./extensions";

/**
 * Notes created before live collaboration only have saved HTML (or markdown). This turns that into a Yjs update.
 * The update is deterministic (fixed client id), so if two people open the same old note at the same moment, both
 * produce identical bytes and merging them changes nothing. Nobody ends up with a duplicated document.
 */
export function seedUpdateFromContent(content: string): Uint8Array {
  const editor = new Editor({ extensions: buildExtensions(), content: toDocHtml(content) });
  const ydoc = new Y.Doc();
  ydoc.clientID = SEED_CLIENT_ID;
  prosemirrorToYXmlFragment(editor.state.doc, ydoc.getXmlFragment(FIELD));
  const update = Y.encodeStateAsUpdate(ydoc);
  ydoc.destroy();
  editor.destroy();
  return update;
}
