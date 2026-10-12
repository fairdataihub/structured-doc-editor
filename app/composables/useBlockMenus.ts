import type { DropdownMenuItem } from "@nuxt/ui";

// Menu items shared by the toolbar, the page gutter and the outline, built for Nuxt UI's
// UDropdownMenu. Each item calls a usePlan() action, so the result is the same from anywhere.

export type MenuItem = DropdownMenuItem & { swatch?: BlockType };

const KEYS: Partial<Record<BlockType, string[]>> = {
  section: ["meta", "alt", "1"],
  question: ["meta", "alt", "2"],
  answer: ["meta", "alt", "0"],
  list: ["meta", "shift", "8"],
};

export function useBlockMenus() {
  const plan = usePlan();
  const review = useReview();

  function styleItems(id: string): MenuItem[][] {
    const b = plan.byId(id);
    if (!b || b.type === "title") return [];

    return [
      [
        { type: "label", label: "Style" },
        ...(["section", "question", "answer", "list"] as const).map<MenuItem>(
          (t) => ({
            label: TYPE_LABEL[t],
            swatch: t,
            kbds: KEYS[t],
            active: b.type === t,
            onSelect: () => plan.setType(id, t),
          }),
        ),
      ],
    ];
  }

  function moveItems(id: string): MenuItem[] {
    const b = plan.byId(id);
    if (!b) return [];
    const st = plan.structure.value;
    const { pre } = plan.numbering.value;
    const name = (s: Block) =>
      `${pre[s.id] ? pre[s.id] + " " : ""}${labelOf(s)}`;
    if (b.type === "section") {
      return [
        { type: "label", label: "Move section" },
        ...st.secs
          .filter((s) => s.b.id !== id)
          .map<MenuItem>((s) => ({
            label: `Before ${name(s.b)}`,
            onSelect: () => plan.commitMove(id, plan.idx(s.b.id)),
          })),
        {
          label: "To the end",
          onSelect: () => plan.commitMove(id, plan.state.blocks.length),
        },
      ];
    }
    if (b.type === "question") {
      const own = st.owner[id]?.sec;

      return [
        { type: "label", label: "Move question into" },
        ...st.secs.map<MenuItem>((s) => ({
          label: name(s.b),
          swatch: "section",
          active: s.b.id === own,
          onSelect: () => plan.commitMove(id, plan.range(s.b.id)[1]),
        })),
      ];
    }

    return [
      { type: "label", label: "Move to the end of" },
      ...st.secs.flatMap<MenuItem>((s) => [
        {
          label: name(s.b),
          swatch: "section",
          onSelect: () => plan.commitMove(id, plan.introEnd(s.b.id)),
        },
        ...s.qs.map<MenuItem>((q) => ({
          label: `   ${name(q.b)}`,
          swatch: "question",
          onSelect: () => plan.commitMove(id, plan.range(q.b.id)[1]),
        })),
      ]),
    ];
  }

  function blockItems(id: string, withStyle = true): MenuItem[][] {
    const b = plan.byId(id);
    if (!b) return [];
    const groups: MenuItem[][] = [];
    if (b.type !== "title") {
      if (withStyle) groups.push(...styleItems(id));
      groups.push([
        {
          label: "Move up",
          icon: "i-lucide-arrow-up",
          kbds: ["alt", "arrowup"],
          onSelect: () => plan.nudge(id, -1),
        },
        {
          label: "Move down",
          icon: "i-lucide-arrow-down",
          kbds: ["alt", "arrowdown"],
          onSelect: () => plan.nudge(id, 1),
        },
        { label: "Move to…", icon: "i-lucide-move", children: moveItems(id) },
      ]);
    }
    const extra: MenuItem[] = [];
    if (isHeadingBlock(b)) {
      const on = b.numbered !== false;
      extra.push({
        label: on ? "Remove number" : "Add number",
        icon: "i-lucide-hash",
        onSelect: () => plan.toggleNumbered(id),
      });
    }
    if (b.type !== "title")
      extra.push({
        label: "Duplicate",
        icon: "i-lucide-copy",
        onSelect: () => plan.duplicate(id),
      });
    const flagged = review.flagged.value[id];
    if (flagged)
      extra.push({
        label: "Review this",
        icon: "i-lucide-circle-alert",
        onSelect: () => review.show("issue", flagged),
      });
    if (extra.length) groups.push(extra);
    if (b.type !== "title") {
      groups.push([
        {
          label:
            b.type === "section"
              ? "Delete section and its contents"
              : b.type === "question"
                ? "Delete question and its answer"
                : "Delete",
          icon: "i-lucide-trash-2",
          color: "error",
          onSelect: () => plan.deleteItem(id),
        },
      ]);
    }

    return groups;
  }

  function addItems(id: string): MenuItem[][] {
    return [
      [
        { type: "label", label: "Add below" },
        ...(["answer", "list", "question", "section"] as const).map<MenuItem>(
          (t) => ({
            label: TYPE_LABEL[t],
            swatch: t,
            onSelect: () => plan.addBlock(id, t),
          }),
        ),
      ],
    ];
  }

  return { styleItems, moveItems, blockItems, addItems };
}
