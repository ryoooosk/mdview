# mdview

ターミナルで Markdown を読むためのビューア。本文を [glow](https://github.com/charmbracelet/glow) で整形して表示し、mermaid のコードブロックは図にして本文の中に表示する。

図は PNG に描画し、kitty graphics protocol で表示する。そのため図が出るのは Ghostty で開いたときだけで、それ以外のターミナルやパイプ出力では、mermaid をコードのまま表示する。

mermaid の図は次のように扱う。

- 図は1つずつ描画する。構文エラーの図があっても、その図だけ mermaid のコードのまま表示し、ほかの図は表示する
- mermaid 12 系を使い、ダークテーマ・透明背景で描画する
- 描画した図はキャッシュする。すべての図がキャッシュ済みなら Chrome を起動しない

## 必要なもの

- macOS
- Ghostty（図を表示するのに必要。kitty でも動く想定だが、未確認）
- Node.js 24 以降
- pnpm
- glow（`brew install glow`）
- Google Chrome

図の描画にはインストール済みの Google Chrome を使う。`pnpm install` で puppeteer 用の Chrome はダウンロードしない。

## セットアップ

```bash
git clone https://github.com/ryoooosk/mdview.git
cd mdview
pnpm install
pnpm build
pnpm add -g link:$PWD
```

最後のコマンドで、`mdv` コマンドがリポジトリへのシンボリックリンクとして入る。更新するときは `git pull` のあと `pnpm build` し直せばよい。

## 使い方

```bash
mdv ノート.md            # ファイルを表示する
mdv data.json            # Markdown 以外のファイルは、コードとして色分けして表示する
cat ノート.md | mdv -    # 標準入力から読む
mdv -w 80 ノート.md      # 80 桁の幅で表示する
```

`-w` を省くと、ターミナルの桁数に合わせる。ページャーは持たず、全文を標準出力に書き出すので、Ghostty のスクロールで読む。

## 図が表示される条件

次をすべて満たすときだけ、図を画像で表示する。満たさないときは描画せず、mermaid のコードのまま表示する。

- 標準出力がターミナル（`| less -R` などのパイプではない）
- tmux の中ではない（`TMUX` が未設定）
- Ghostty か kitty で開いている（`TERM_PROGRAM=ghostty`、`TERM` に `xterm-ghostty` か `xterm-kitty` を含む、`KITTY_WINDOW_ID` が設定されている、のいずれか）

描画に失敗した図は、何番目の図かとエラー内容を標準エラー出力に出す。

```text
mdv: diagram 3 could not be rendered: Parse error on line 3:
```

## キャッシュ

描画した PNG は `~/Library/Caches/mdview/` に保存する。図のソースと描画条件（mermaid のバージョン、テーマなど）が同じなら、次からはキャッシュを使う。図はターミナルの幅によらず同じ条件で描くので、ウィンドウの幅を変えても描き直さない。

14 日使われていない PNG は、新しい図を保存したときに自動で消す。図を表示するたびに、使った PNG の更新日時を新しくしている。

すぐにすべて消したいときは、ディレクトリごと削除する。

```bash
rm -rf ~/Library/Caches/mdview
```

構文エラーの図はキャッシュしない。そのため、構文エラーの図を含むファイルは開くたびに Chrome を起動する（手元の実測で約 0.8 秒）。

## 制約

- 図は、図を置く行をまるごと画像に置き換えて表示する。そのため、図は左端から表示されて本文の左の余白とそろわず、リストや引用の中ではその行の `•` や `│` も表示されない
- 図の表示幅は、1 桁を 8px と仮定して計算している
- 図は、ターミナルの幅によらず幅 800px の領域で描く。ほとんどの図は領域の幅に関係なく同じ大きさになるが、gantt（ガントチャート）と xychart（XY チャート）は領域に合わせて広がるため、いつも同じ幅（gantt は約 800px、xychart は 700px）で描かれる。それより狭いターミナルでは縮小されて表示される
- 縦に長い図は画面に収まらないので、スクロールして見る
- Ghostty が保持する画像の容量には上限（`image-storage-limit`）があり、長く使っていると古い画像が消えることがある
- Markdown 以外のファイルの配色は、glow 3.0.0 が使う glamour v2.0.1 の dark スタイルから写したもの（`styles/code.json`）。glow が配色を変えると、Markdown 内のコードブロックと色がずれることがある

## 開発

開発には Node.js 26（`.nvmrc`）を使う。

```bash
pnpm build           # 型チェックして dist/ に出力する
pnpm test            # node --test で src/ のテストを実行する
pnpm test:coverage   # カバレッジ付きでテストを実行する（Node.js 26 が必要）
pnpm check           # Biome で lint・format する
```

## 利用条件

著作権は作者（ryoooosk）が持つ。オープンソースのライセンスは付けていない。

自分で使う範囲なら、個人でも業務でも、clone・インストール・実行・改変は自由にしてよい。次のことをするときは、事前に作者の許可を得ること。

- 再配布する（改変したものを含む）
- 改変したものを公開する

許可を求めるときは、GitHub の Issue で連絡する。

無保証で提供する。使ったことで生じた損害について、作者は責任を負わない。
