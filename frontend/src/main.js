// Standalone dev entry. Mostra InserimentoOre.
import { createApp, h } from 'vue';
import { NConfigProvider, NMessageProvider, NDialogProvider, itIT, dateItIT } from 'naive-ui';
import InserimentoOre from './pages/InserimentoOre.vue';

const App = {
  render() {
    return h(NConfigProvider, { locale: itIT, dateLocale: dateItIT }, () =>
      h(NDialogProvider, null, () =>
        h(NMessageProvider, null, () => h(InserimentoOre))
      )
    );
  },
};

createApp(App).mount('#app');
