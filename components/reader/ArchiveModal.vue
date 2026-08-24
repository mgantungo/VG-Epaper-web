<script setup>
import { ref, computed } from 'vue';
import { useAccountStore } from '~/stores/account';

const props = defineProps({ open: { type: Boolean, required: true } });
const emit = defineEmits(['close', 'select-date']);

const account = useAccountStore();
const today = new Date();
const years = Array.from({ length: 5 }, (_, i) => today.getFullYear() - i);
const selectedYear = ref(today.getFullYear());
const calMonth = ref(today.getMonth());

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const daysInMonth = computed(() => new Date(selectedYear.value, calMonth.value + 1, 0).getDate());
const startOffset = computed(() => (new Date(selectedYear.value, calMonth.value, 1).getDay() + 6) % 7);
const lastAvailableMonth = computed(() => (selectedYear.value === today.getFullYear() ? today.getMonth() : 11));

function dateIsoFor(day) {
  return `${selectedYear.value}-${String(calMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
function isFuture(day) {
  return new Date(selectedYear.value, calMonth.value, day) > today;
}
function isUnlocked(day) {
  const iso = dateIsoFor(day);
  const isToday = iso === today.toISOString().slice(0, 10);
  return isToday ? account.subscriptionActive : account.hasPurchased(iso);
}

function pickYear(y) {
  selectedYear.value = y;
  calMonth.value = y === today.getFullYear() ? today.getMonth() : 11;
}
function selectDay(day) {
  if (isFuture(day)) return;
  emit('select-date', dateIsoFor(day));
}
</script>

<template>
  <div
    class="fixed inset-0 z-[230] flex items-center justify-center p-6 bg-black/55 transition-opacity"
    :class="open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'"
    @click.self="emit('close')"
  >
    <div v-if="open" class="w-full max-w-3xl h-[min(84vh,700px)] bg-white text-neutral-900 rounded-xl overflow-hidden flex flex-col shadow-2xl">
      <div class="flex items-center justify-between px-6 py-4 bg-neutral-100 border-b">
        <h2 class="font-serif font-bold text-xl">Archive</h2>
        <button class="w-8 h-8 rounded-full hover:bg-black/5" @click="emit('close')">✕</button>
      </div>
      <div class="flex-1 min-h-0 flex gap-6 p-6">
        <div class="flex-none w-28 flex flex-col">
          <div
            v-for="y in years" :key="y"
            class="py-3 border-b cursor-pointer font-serif"
            :class="y === selectedYear ? 'font-bold border-neutral-900' : 'text-neutral-700 border-neutral-200'"
            @click="pickYear(y)"
          >{{ y }}</div>
        </div>
        <div class="flex-1 overflow-y-auto">
          <div class="flex items-center justify-center gap-5 mb-4">
            <button class="w-8 h-8 rounded-md border disabled:opacity-30" :disabled="calMonth <= 0" @click="calMonth--">‹</button>
            <span class="font-serif font-bold">{{ monthNames[calMonth] }} {{ selectedYear }}</span>
            <button class="w-8 h-8 rounded-md border disabled:opacity-30" :disabled="calMonth >= lastAvailableMonth" @click="calMonth++">›</button>
          </div>
          <div class="grid grid-cols-7 gap-2 max-w-md mx-auto">
            <div v-for="d in ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']" :key="d" class="font-mono text-[11px] text-neutral-400 text-center pb-1">{{ d }}</div>
            <div v-for="n in startOffset" :key="'blank'+n" />
            <div
              v-for="day in daysInMonth" :key="day"
              class="aspect-square flex items-center justify-center rounded-lg font-mono text-sm cursor-pointer relative"
              :class="isFuture(day) ? 'text-neutral-300 cursor-default' : (isUnlocked(day) ? 'bg-green-50 font-bold border border-neutral-900' : 'hover:bg-neutral-100 border border-transparent')"
              @click="selectDay(day)"
            >{{ day }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
