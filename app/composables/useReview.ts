// What needs a human look, derived from the plan: an unnumbered question, repeated headings
// that were tidied, and cross-references a move made stale. Nothing is compared with the
// original PDF: people check the wording and structure themselves, with the Structure colours.

export interface OpenIssue {
  id: string;
  kind: "unnumbered" | "autofix" | "xref";
  blockId: string;
  blockIds: string[];
  ref?: CrossRef;
  now?: string | null;
}

export interface IssueView {
  kindLabel: string;
  title: string;
  where: string;
  body?: string;
  actions: { label: string; primary?: boolean; run: () => void }[];
}

const dock = reactive<{
  mode: null | "intro" | "issue" | "done";
  id: string | null;
  shown: string | null;
}>({
  mode: null,
  id: null,
  shown: null,
});

function createReview() {
  const plan = usePlan();
  const { state, numbering, structure, byId, idx } = plan;

  const xrefIssues = (): OpenIssue[] => {
    const { secNum } = numbering.value;
    const out: OpenIssue[] = [];
    for (const r of state.refs) {
      const sec = byId(r.secId);
      const now =
        sec && sec.type === "section" && secNum[sec.id]
          ? sectionName(secNum[sec.id]!)
          : null;
      if (now === r.text || r.dismissed === (now ?? "gone")) continue;
      const blk = state.blocks.find(
        (b) => isTextBlock(b) && plainOf(b).includes(r.text),
      );
      if (blk)
        out.push({
          id: `x-${r.id}`,
          kind: "xref",
          blockId: blk.id,
          blockIds: [blk.id],
          ref: r,
          now,
        });
    }

    return out;
  };

  const openIssues = computed<OpenIssue[]>(() => {
    const out: OpenIssue[] = [];
    for (const is of state.issues) {
      if (is.status === "open" && byId(is.blockId))
        out.push({
          id: is.id,
          kind: "unnumbered",
          blockId: is.blockId,
          blockIds: [is.blockId],
        });
    }
    if (state.autofix.status === "open") {
      const ids = state.autofix.items
        .map((f) => f.secId)
        .filter((id) => byId(id));
      if (ids.length)
        out.push({
          id: "autofix",
          kind: "autofix",
          blockId: ids[0]!,
          blockIds: ids,
        });
    }
    out.push(...xrefIssues());

    return out.sort((a, b) => idx(a.blockId) - idx(b.blockId));
  });

  const flagged = computed(() => {
    const m: Record<string, string> = {};
    for (const is of openIssues.value)
      for (const id of is.blockIds) m[id] ??= is.id;

    return m;
  });

  const current = computed(() =>
    dock.mode === "issue"
      ? (openIssues.value.find((x) => x.id === dock.id) ?? null)
      : null,
  );
  const highlighted = computed(() => new Set(current.value?.blockIds ?? []));

  function show(mode: "intro" | "issue" | "done", id?: string) {
    dock.mode = mode;
    dock.id = id ?? null;
    dock.shown = null;
    if (mode !== "intro") plan.ui.introSeen = true;
  }
  function close() {
    dock.mode = null;
    plan.ui.introSeen = true;
  }
  function start() {
    const list = openIssues.value;
    if (list.length) show("issue", list[0]!.id);
    else show("done");
  }
  function step(dir: 1 | -1) {
    const list = openIssues.value;
    if (!list.length) return show("done");
    const i = list.findIndex((x) => x.id === dock.id);
    show("issue", list[(i + dir + list.length) % list.length]!.id);
  }
  /** Runs a fix, then moves to the next open item (or to "done"). */
  function resolve(is: OpenIssue, fix: () => void) {
    const i = Math.max(
      0,
      openIssues.value.findIndex((x) => x.id === is.id),
    );
    fix();
    const after = openIssues.value;
    if (after.length) show("issue", after[Math.min(i, after.length - 1)]!.id);
    else show("done");
  }
  const keep = (is: OpenIssue) =>
    resolve(is, () => {
      plan.pushHistory();
      const stored = state.issues.find((x) => x.id === is.id);
      if (stored) stored.status = "kept";
    });

  function location(id: string) {
    const o = structure.value.owner[id];
    const { pre } = numbering.value;
    const s = byId(o?.sec);
    const q = byId(o?.q);

    return [
      s && `${pre[s.id] ?? ""} ${labelOf(s)}`.trim(),
      q && `${pre[q.id] ?? ""} ${labelOf(q)}`.trim(),
    ]
      .filter(Boolean)
      .join("  ·  ");
  }

  const view = computed<IssueView | null>(() => {
    const is = current.value;
    if (!is) return null;
    const { pre, short } = numbering.value;
    if (is.kind === "unnumbered") {
      const o = structure.value.owner[is.blockId];
      const s = structure.value.secs.find((x) => x.b.id === o?.sec);
      const siblings = s
        ? s.qs
            .filter((q) => q.b.id !== is.blockId && q.b.numbered !== false)
            .map((q) => short[q.b.id])
        : [];
      let n = 0;
      for (const q of s?.qs ?? []) {
        if (q.b.numbered !== false || q.b.id === is.blockId) n++;
        if (q.b.id === is.blockId) break;
      }

      return {
        kindLabel: "Numbering",
        title: "This question has no number",
        where: location(is.blockId),
        body: `${siblings.length ? `The questions around it are numbered ${siblings.join(" and ")}. ` : ""}It had no number or letter in the original either, so it was left that way.`,
        actions: [
          {
            label: `Number it ${n}`,
            primary: true,
            run: () => resolve(is, () => plan.toggleNumbered(is.blockId)),
          },
          { label: "Keep it without a number", run: () => keep(is) },
        ],
      };
    }
    if (is.kind === "autofix") {
      const names = is.blockIds.map(
        (id) => (pre[id] ?? "").replace(/:$/, "") || labelOf(byId(id)!),
      );

      return {
        kindLabel: "Tidied for you",
        title: "Repeated headings removed",
        where: names.join(", "),
        body: "These sections have no sub-questions, so the extraction repeated each section title as its only question. Each heading now appears once, with its text underneath.",
        actions: [
          {
            label: "Looks right",
            primary: true,
            run: () =>
              resolve(is, () => {
                plan.pushHistory();
                state.autofix.status = "kept";
              }),
          },
          {
            label: "Put them back",
            run: () =>
              resolve(is, () => {
                plan.pushHistory();
                for (const f of state.autofix.items) {
                  const i = idx(f.secId);
                  if (i >= 0)
                    state.blocks.splice(i + 1, 0, {
                      id: uid(),
                      type: "question",
                      html: escapeHtml(f.text),
                      numbered: false,
                    });
                }
                state.autofix.status = "undone";
                plan.toast("Repeated headings put back");
              }),
          },
        ],
      };
    }
    const r = is.ref!;

    return {
      kindLabel: "Cross-reference",
      title: "A reference may be out of date",
      where: location(is.blockId),
      body: `This text says “${r.text}”. ${is.now ? `That section, ${r.secLabel}, is now ${is.now}.` : `It pointed to ${r.secLabel}, which has been deleted.`}`,
      actions: [
        ...(is.now
          ? [
              {
                label: `Change it to “${is.now}”`,
                primary: true,
                run: () =>
                  resolve(is, () => {
                    plan.pushHistory();
                    const b = byId(is.blockId)!;
                    const stored = state.refs.find((x) => x.id === r.id)!;
                    b.html = b.html.replace(stored.text, is.now!);
                    stored.text = is.now!;
                    plan.toast(`Changed to “${is.now}”`);
                  }),
              },
            ]
          : []),
        {
          label: "Leave it as is",
          run: () =>
            resolve(is, () => {
              plan.pushHistory();
              const stored = state.refs.find((x) => x.id === r.id);
              if (stored) stored.dismissed = is.now ?? "gone";
            }),
        },
      ],
    };
  });

  // Keep the dock pointing at a live item; scroll to it once when it changes.
  watch(
    () => [dock.mode, dock.id, openIssues.value.map((x) => x.id).join()],
    () => {
      if (dock.mode !== "issue") return;
      const list = openIssues.value;
      if (!list.some((x) => x.id === dock.id)) {
        if (list.length) dock.id = list[0]!.id;
        else dock.mode = "done";
      }
      const is = current.value;
      if (is && dock.shown !== is.id) {
        dock.shown = is.id;
        plan.select(is.blockId);
        plan.scrollToBlock(is.blockId, 0.18);
      }
    },
  );

  return {
    dock,
    openIssues,
    flagged,
    current,
    highlighted,
    view,
    show,
    close,
    start,
    step,
  };
}

let instance: ReturnType<typeof createReview> | undefined;

/** One shared review state for every component (created once, outside any component). */
export function useReview() {
  instance ??= effectScope(true).run(createReview)!;

  return instance;
}
