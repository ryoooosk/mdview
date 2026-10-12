# styles

`code.json` は、Markdown 以外のファイル（`mdv data.json` など）をコードとして表示するときに、glow の `-s` に渡すスタイル。`src/glow.ts` の `runGlowCode` が使う。

## glow の dark を使わない理由

mdview は、ファイルの中身をコードブロックで囲んで標準入力から glow に渡す。glow の dark のままだと、コードブロックの左に 2 桁の余白が付き、`glow data.json` でファイルを開いたときより 2 桁右にずれる。glow はファイルを開いたときだけ、コードブロックの余白を 0 にしているため。

そこで dark の値を写し、`code_block.margin` だけを 0 にした。`-s` に渡した JSON は dark を上書きするのではなく、それだけでスタイル全体になる。そのため余白以外の値も書く必要がある。`{"code_block": {"margin": 0}}` だけを渡すと、色が付かず、出力全体の余白もなくなる。

写した元は、glow 3.0.0 が使う glamour v2.0.1 の [`styles/dark.json`](https://github.com/charmbracelet/glamour/blob/v2.0.1/styles/dark.json)。そのうち `document` と `code_block` だけを持つ。渡すのはコードブロック 1 つだけなので、見出しやリストなどのほかの項目は使われない。

## 見取り表

「表示への影響」は、手元のファイルで項目を消したり値を変えたりして確かめた結果。

### document と code_block

| 項目 | 値 | 決めるもの | 表示への影響 | dark との違い |
| --- | --- | --- | --- | --- |
| `document.block_prefix` | `"\n"` | 出力の前に足す文字列 | 消すと、出力の前の空行が 1 行減る | 同じ |
| `document.block_suffix` | `"\n"` | 出力の後に足す文字列 | 消すと、出力の最後の改行がなくなる | 同じ |
| `document.color` | `"252"` | 出力全体の文字色（256 色の番号） | 見た目は変わらない。コードの色は `chroma` で決まり、この色が付くのは余白の空白だけ | 同じ |
| `document.margin` | `2` | 出力全体の左の余白（桁数） | 消すと、左端から表示される | 同じ |
| `code_block.color` | `"244"` | `chroma` がないときのコードの文字色 | 使われない。`chroma` があるので、コードはいつも `chroma` の色になる | 同じ |
| `code_block.margin` | `0` | コードブロックの左の余白（桁数） | dark と同じ 2 にすると、左の余白が 4 桁になる | **dark は `2`** |
| `code_block.chroma` | 下の表 | トークンの種類ごとの色 | 下の表 | 同じ |

### code_block.chroma

各項目は、glamour が構文ハイライトに使う chroma のトークンの種類に対応する。どの文字がどの種類になるかは、chroma の言語ごとの定義で決まる。glow は、ここに書いた色を 256 色のうち近いものにして出力する。

値が `{}` の項目は自分の色を持たず、上位の種類の色を使う。たとえば `name_other` の識別子は `name` の色になる。

例は、JSON・YAML・TypeScript・Python・Go・C・HTML・diff・zsh のファイルで、項目の色だけを変えて確かめたもの。

| 項目 | 値 | 色が付くものの例 |
| --- | --- | --- |
| `text` | `#C4C4C4` | どの種類にも当たらない文字（diff の変更のない行、HTML のタグの外の文字、YAML のリストの `-`） |
| `error` | 文字 `#F1F1F1`、背景 `#F05B5B` | 字句解析できなかった文字 |
| `comment` | `#676767` | コメント（`//`、`#`、`<!-- -->`） |
| `comment_preproc` | `#FF875F` | C の `#include`・`#define`、HTML の `<!DOCTYPE html>` |
| `keyword` | `#00AAFF` | `if`・`return` などのキーワード、JSON の `true` |
| `keyword_reserved` | `#FF5FD2` | TypeScript の `import`・`export`・`class`・`async` |
| `keyword_namespace` | `#FF5F87` | Python の `import`・`from`、Go の `package`・`import` |
| `keyword_type` | `#6E6ED8` | C の `int`・`void`、Go の `int` |
| `operator` | `#EF8080` | `=`・`->`・`and`・`not` |
| `punctuation` | `#E8E8A8` | `{` `}` `(` `)` `:` `,` |
| `name` | `#C4C4C4` | 変数名やモジュール名などの識別子 |
| `name_builtin` | `#FF8EC7` | 組み込みの名前（Python の `int`、Go の `len`、zsh の `echo`） |
| `name_tag` | `#B083EA` | JSON と YAML のキー、HTML のタグ名 |
| `name_attribute` | `#7A7AE6` | HTML の属性名（`class`・`id`） |
| `name_class` | `#F1F1F1`、太字、下線 | Python の `class` の後のクラス名 |
| `name_constant` | `{}` | 定数名（例は見つからなかった） |
| `name_decorator` | `#FFFF87` | Python のデコレーター（`@dataclass`） |
| `name_exception` | `{}` | Python の `ValueError` などの例外名 |
| `name_function` | `#00D787` | 関数名（Python の `def` の後の名前、Go の `main`・`Println`） |
| `name_other` | `{}` | Go や TypeScript の識別子の一部 |
| `literal` | `{}` | リテラル全体の上位の種類（例は見つからなかった） |
| `literal_number` | `#6EEFC0` | 数値 |
| `literal_date` | `{}` | 日付（例は見つからなかった） |
| `literal_string` | `#C69669` | 文字列（JSON と YAML の値の文字列、テンプレートリテラル、正規表現リテラル） |
| `literal_string_escape` | `#AFFFD7` | Python の文字列の中の `\n` |
| `generic_deleted` | `#FD5B5B` | diff の削除した行（`-`） |
| `generic_emph` | 斜体 | 強調（例は見つからなかった） |
| `generic_inserted` | `#00D787` | diff の追加した行（`+`） |
| `generic_strong` | 太字 | 太字の強調（例は見つからなかった） |
| `generic_subheading` | `#777777` | diff の `@@ -1,2 +1,2 @@` |
| `background` | 背景 `#373737` | chroma の基準の背景色。赤に変えても出力は変わらなかった |

## glow を更新したとき

glow が使う glamour の版が変わると、dark の配色が変わることがある。そのときは次の手順で写し直す。

1. glow の `go.mod` で、`charm.land/glamour/v2` の版を確かめる
2. その版の glamour の `styles/dark.json` から、`document` と `code_block` を写す
3. `code_block.margin` を 0 にする
4. `glow -s dark <ファイル>` と `mdv <ファイル>` の出力が同じになることを確かめる。glow 自体が、コメントの色の番号を実行ごとに 241 と 242 で揺らすので、そこだけは違ってもよい
