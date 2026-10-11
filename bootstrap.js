import { main } from './Main.js';

main().then((game) => {
  if (import.meta.hot) {
    import.meta.hot.dispose(() => game.destroy());
  }
}).catch((error) => {
  console.error(error);
  const message = document.createElement('p');
  message.id = 'error';
  message.textContent = 'ゲームを起動できませんでした。WebGL が有効なブラウザーでお試しください。';
  document.body.appendChild(message);
});
