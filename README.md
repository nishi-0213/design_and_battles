# 設計＆戦闘

PixiJS 8 と JavaScript、GLSL、pixi-filters を使ったゲーム。
現在は全画面の HULL SIZE モニターに機体を配置する土台です。
WASD で移動、マウスホイールで拡大縮小できます。
左側のカテゴリボタンにマウスを重ねると右側に小ウィンドウが開きます。
PNG ブロックの読み込み・配置操作は今後追加します。

## 手元で試す

Node.js 24 を推奨します。

```sh
npm ci
npm run dev
```

ターミナルに表示される URL を WebGL 対応ブラウザーで開いてください。

## ビルド

```sh
npm run build
npm run preview
```

## GitHub Pages

リポジトリの Settings → Pages → Build and deployment の Source を
**GitHub Actions** に設定してください。
`main` への push または Actions の「Deploy to GitHub Pages」の手動実行で公開します。
公開 URL は成功した deployment の出力で確認できます。

仕様と未決事項は [doc/design.md](doc/design.md) に保存します。
