import { createTitleScreen } from './TitleScreen.js';

const game = createTitleScreen();
if (import.meta.hot) {
  import.meta.hot.dispose(() => game.destroy());
}
