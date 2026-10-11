# 設計＆戦闘ゲーム 設計書

## 目的

機体などを設計し、戦闘するゲームを開発する。
具体的なゲームルール、設計対象、戦闘方式は今後の会話で決める。

## 技術構成

- 描画: PixiJS 8
- 言語: JavaScript（将来 TypeScript の採用も検討可能）
- シェーダー: GLSL
- 描画効果: pixi-filters
- 描画バックエンド: WebGL

## 現在の実装

`Main.js` をエントリーポイントとして用意した。

- `main()` で PixiJS の Application を初期化する。
- 画面サイズに合わせて描画領域を変更する。
- `world` レイヤーに仮の機体を描画する。
- pixi-filters の GlowFilter で発光効果を付ける。
- 戻り値の `destroy()` で描画リソースを破棄する。

仮の機体は描画確認用であり、ゲーム仕様として確定したものではない。
独自 GLSL シェーダーは未追加。

## 起動と公開

- Vite を開発サーバーとビルドに使用する。
- `index.html` → `bootstrap.js` → `Main.js` の順に起動する。
- Node.js 24 を推奨する。`npm ci` で依存関係を導入し、`npm run dev` で起動する。
- `npm run build` で `dist/` に静的ファイルを生成する。
- GitHub Pages 用の Actions を用意する。公開にはリポジトリの Pages の Source を GitHub Actions に設定する必要がある。
- インストール、本番ビルド、Chromium（ソフトウェア WebGL）での機体描画と画面リサイズを確認済み。
- GitHub Pages への公開と公開先での動作は未確認。

## 設計書の運用

会話で決まった仕様や技術上の判断は `doc/` に保存する。
実装前に関連する設計書を参照し、仕様変更時には実装と併せて更新する。
提案や未決事項は確定事項と区別する。
