<script setup lang="ts">
// The Preview tab: the plan as a document, one fixed style per type. Every part links back to its
// block; numbers are left out, so it reads like the final document.

const { plan, select, sections, selected } = useDmpImport();

function isOn(target: ImportSelection) {
  const current = selected.value;

  return (
    current.kind === target.kind &&
    current.id === target.id &&
    (current.part ?? null) === (target.part ?? null)
  );
}

function classes(target: ImportSelection, tone: ImportTone) {
  return isOn(target) ? IMPORT_TONE_SELECTED[tone] : "hover:bg-elevated";
}

function jump(target: ImportSelection) {
  select(target, { scroll: true, focus: true });
}

const paragraphs = (text: string) => text.trim().split(/\n{2,}/);

const linkClass =
  "-mx-1.5 block min-h-6 w-[calc(100%+0.75rem)] cursor-pointer rounded-sm px-1.5 py-px text-left";
</script>

<template>
  <article class="text-[13px] leading-relaxed">
    <h3 class="mt-1 mb-4 text-center text-lg font-bold tracking-tight">
      <button
        type="button"
        :class="[linkClass, classes({ kind: 'plan' }, 'title')]"
        class="text-center"
        @click="jump({ kind: 'plan' })"
      >
        {{ plan.title.trim() || "Untitled plan" }}
      </button>
    </h3>

    <template v-for="section in sections" :key="section.id">
      <h4 class="border-default mt-5 mb-2 border-b pb-1 text-[15px] font-bold">
        <button
          type="button"
          :class="[
            linkClass,
            classes({ kind: 'section', id: section.id }, 'section'),
          ]"
          @click="jump({ kind: 'section', id: section.id })"
        >
          {{ section.title.trim() || "Untitled section" }}
        </button>
      </h4>

      <div
        v-if="section.description.trim()"
        role="button"
        tabindex="0"
        :class="[
          linkClass,
          classes(
            { kind: 'section', id: section.id, part: 'description' },
            'description',
          ),
        ]"
        class="text-toned italic"
        @click="jump({ kind: 'section', id: section.id, part: 'description' })"
        @keydown.enter="
          jump({ kind: 'section', id: section.id, part: 'description' })
        "
      >
        <p
          v-for="(text, i) in paragraphs(section.description)"
          :key="i"
          class="mb-2 whitespace-pre-line"
        >
          {{ text }}
        </p>
      </div>

      <template v-for="question in section.questions" :key="question.id">
        <h5 v-if="question.text.trim()" class="mt-3.5 mb-1 font-semibold">
          <button
            type="button"
            :class="[
              linkClass,
              classes({ kind: 'question', id: question.id }, 'question'),
            ]"
            @click="jump({ kind: 'question', id: question.id })"
          >
            {{ question.text.trim() }}
          </button>
        </h5>

        <div
          v-if="question.answer.trim()"
          role="button"
          tabindex="0"
          :class="[
            linkClass,
            classes(
              { kind: 'question', id: question.id, part: 'answer' },
              'answer',
            ),
          ]"
          @click="jump({ kind: 'question', id: question.id, part: 'answer' })"
          @keydown.enter="
            jump({ kind: 'question', id: question.id, part: 'answer' })
          "
        >
          <p
            v-for="(text, i) in paragraphs(question.answer)"
            :key="i"
            class="mb-2 whitespace-pre-line"
          >
            {{ text }}
          </p>
        </div>
      </template>
    </template>
  </article>
</template>
