<script setup>
import { NConfigProvider, NMessageProvider, NDialogProvider, itIT, dateItIT } from 'naive-ui';
import CalendarInserimentoOre from '../components/Calendar/CalendarInserimentoOre.vue';
</script>

<template>
  <NConfigProvider :locale="itIT" :date-locale="dateItIT">
    <NDialogProvider>
      <NMessageProvider>
        <div class="page">
          <h1>Le mie Ore</h1>
          <CalendarInserimentoOre />
        </div>
      </NMessageProvider>
    </NDialogProvider>
  </NConfigProvider>
</template>
