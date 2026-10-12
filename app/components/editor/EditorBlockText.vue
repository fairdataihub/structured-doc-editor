<script setup lang="ts">
import { Extension, getHTMLFromFragment } from "@tiptap/core";
import { Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor, type Editor } from "@tiptap/vue-3";
import type { FocusPos } from "~/composables/usePlan";

// One Tiptap editor per block. It only edits the block's plain text; everything structural
// (Enter splits, Backspace joins, arrows move between blocks, undo) goes through usePlan().
// No block has bold, italic or underline: the style is fixed, so those marks aren't loaded.

const props = defineProps<{ block: Block }>();
const plan = usePlan();
const id = props.block.id;

const toDoc = (html: string) => `<p>${html}</p>`;
const fromEditor = (ed: Editor) =>
  ed
    .getHTML()
    .replace(/^<p>/, "")
    .replace(/<\/p>$/, "")
    .replace(/<\/p><p>/g, "<br>");

// Swallow the shortcuts so the browser doesn't apply its own bold/italic/underline either.
const blocked = () => {
  plan.toast("The style is fixed: no bold, italic or underline.", false);

  return true;
};

const BlockKeys = Extension.create({
  name: "dmpBlockKeys",
  addKeyboardShortcuts() {
    return {
      Enter: ({ editor }) => {
        const { $from, $to } = editor.state.selection;
        const before = getHTMLFromFragment(
          $from.parent.content.cut(0, $from.parentOffset),
          editor.schema,
        );
        const after = getHTMLFromFragment(
          $to.parent.content.cut($to.parentOffset),
          editor.schema,
        );
        plan.splitBlock(id, before, after);

        return true;
      },
      Backspace: ({ editor }) => {
        const { empty, $from } = editor.state.selection;
        if (empty && $from.parentOffset === 0 && $from.index(0) === 0)
          return plan.mergeBack(id);

        return false;
      },
      ArrowUp: ({ editor }) =>
        editor.view.endOfTextblock("up")
          ? (plan.focusNeighbour(id, -1), true)
          : false,
      ArrowDown: ({ editor }) =>
        editor.view.endOfTextblock("down")
          ? (plan.focusNeighbour(id, 1), true)
          : false,
      ArrowLeft: ({ editor }) => {
        const { empty, $from } = editor.state.selection;

        return empty && $from.parentOffset === 0 && $from.index(0) === 0
          ? (plan.focusNeighbour(id, -1), true)
          : false;
      },
      ArrowRight: ({ editor }) => {
        const { empty, $to } = editor.state.selection;

        return empty &&
          $to.parentOffset === $to.parent.content.size &&
          $to.index(0) === editor.state.doc.childCount - 1
          ? (plan.focusNeighbour(id, 1), true)
          : false;
      },
      "Alt-ArrowUp": () => (plan.nudge(id, -1), true),
      "Alt-ArrowDown": () => (plan.nudge(id, 1), true),
      "Mod-z": () => (plan.undo(), true),
      "Mod-Shift-z": () => (plan.redo(), true),
      "Mod-y": () => (plan.redo(), true),
      "Mod-b": blocked,
      "Mod-i": blocked,
      "Mod-u": blocked,
    };
  },
});

const editor = useEditor({
  content: toDoc(props.block.html),
  injectCSS: false,
  extensions: [
    StarterKit.configure({
      blockquote: false,
      bulletList: false,
      code: false,
      codeBlock: false,
      dropcursor: false,
      gapcursor: false,
      heading: false,
      undoRedo: false,
      horizontalRule: false,
      listItem: false,
      listKeymap: false,
      link: false,
      orderedList: false,
      strike: false,
      trailingNode: false,
      bold: false,
      italic: false,
      underline: false,
    }),
    Placeholder.configure({ placeholder: TYPE_LABEL[props.block.type] }),
    BlockKeys,
  ],
  editorProps: {
    attributes: {
      spellcheck: "true",
      "aria-label": TYPE_LABEL[props.block.type],
    },
    // Pasted text arrives as plain text: no outside fonts, colours, emphasis or markdown.
    handlePaste: (view, event) => {
      const text = event.clipboardData?.getData("text/plain");
      if (text == null) return false;
      // Keep a space at either end so the pasted words don't run into the text around them.
      const lead = /^\s/.test(text) ? " " : "";
      const trail = /\s$/.test(text) ? " " : "";
      view.dispatch(
        view.state.tr.insertText(lead + stripMarkdown(text) + trail),
      );

      return true;
    },
    handleDrop: () => true,
  },
  onUpdate: ({ editor: ed }) => plan.updateHtml(id, fromEditor(ed as Editor)),
  onFocus: () => plan.select(id),
  onBlur: () => plan.endTyping(),
});

// Changes from outside (undo, "Use the PDF version", merges) flow into the editor.
watch(
  () => props.block.html,
  (html) => {
    const ed = editor.value;
    if (ed && !ed.isDestroyed && html !== fromEditor(ed))
      ed.commands.setContent(toDoc(html), { emitUpdate: false });
  },
);

function applyFocus(req: { id: string; pos: FocusPos } | null) {
  const ed = editor.value;
  if (!req || req.id !== id || !ed || ed.isDestroyed) return;
  const size = ed.state.doc.content.size;
  const pos =
    typeof req.pos === "number" ? Math.min(1 + req.pos, size - 1) : req.pos;
  ed.commands.focus(pos, { scrollIntoView: false });
  plan.focusReq.value = null;
  plan.scrollToBlock(id, "nearest");
}
watch(plan.focusReq, (req) => nextTick(() => applyFocus(req)));
watch(editor, () => applyFocus(plan.focusReq.value));
</script>

<template>
  <EditorContent :editor="editor" class="tx" />
</template>
