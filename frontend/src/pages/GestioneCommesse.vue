<script setup>
import { NConfigProvider, NMessageProvider, NDialogProvider, itIT, dateItIT } from 'naive-ui';
import GestioneCommesseInner from './GestioneCommesseInner.vue';
</script>

<template>
  <NConfigProvider :locale="itIT" :date-locale="dateItIT">
    <NDialogProvider>
      <NMessageProvider>
        <GestioneCommesseInner />
      </NMessageProvider>
    </NDialogProvider>
  </NConfigProvider>
</template>
