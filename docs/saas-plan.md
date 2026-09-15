# TypeMon SaaS 化計画（1案）

作成: 2026-09-15。対象: type-mon（Latin→Cyrillic 変換 + AI 添削）。

## 現状（読んで確認した事実）

- 変換はクライアント側で完結（`lib/transliterate.ts`、オフライン動作、PWA）
- AI 添削 `/api/polish` は Gemini 2.5 flash-lite、500 文字、**認証なし・無制限**（3fe7f5e で制限解除）
- 履歴は localStorage 5 件、設定モーダルは実質「アルファベット早見表」
- 認証・DB・決済・利用量計測は **ゼロ**。依存は next/react/framer-motion/@google/genai のみ
- Memorio（IOTusul）に流用できる部品: Supabase Auth、`payment_orders` + `entitlements` の注文/権利モデル、`ai_usage` 追記専用テーブル、demo プロバイダ付き checkout（QPay に差し替える設計）、QR 表示

## 仮定

1. 守るもの: **ログインなしで変換は今のまま全部使える**（オフライン含む）。SaaS 化で失う体験を作らない
2. 有料の価値は「AI 添削を **たくさん・長く** 使える」こと。新機能を積むより、既にある添削の枠と質を上げる
3. 決済はモンゴル市場向けに **QPay**（今日の Qpay 加盟店フォームのスクショから申請中と判断）。承認まで Memorio と同じ `provider: 'demo'` で流し、承認後に差し替える
4. 認証は Supabase（Memorio/Futari と同じ運用）。パスワードは持たず **Google + メールのマジックリンク** のみ
5. 市場価格は Memorio より軽いツールなので **Plus 6,900₮/月・49,000₮/年** を初期値にする（下の「決めてほしいこと」参照）

## 案: 「ゲスト無料・ログインで枠・Plus で解放」の 3 段階

概要（3行）:
ログインなしの体験は一切変えず、AI 添削だけに「ゲスト 1 日 3 回 → ログインで月 30 回 → Plus で月 1,000 回＋2,000 文字＋上位モデル」の段階を付ける。
DB は Supabase の 3 テーブル（`entitlements` / `payment_orders` / `ai_usage`）だけ。ゲスト枠は DB を使わず署名付き Cookie で数える。
課金画面は `/plus`（説明・価格）→ `/plus/checkout`（QR）→ 完了の 3 画面、アプリ内は「残り回数チップ」と「上限到達シート」の 2 部品だけ。

なぜこれで足りるか: 売るものが 1 つ（添削枠）なので、権利は tier 1 列で表せる。Memorio の注文・権利・計測モデルをそのまま持ち込めるので新設計はゼロ。ゲスト枠を Cookie にすることで未ログイン者の行を DB に作らず、簡潔さと悪用耐性を両立できる。

外れたと分かる条件: QPay 承認が 1 か月以上遅れ、demo 有効化を本番で使わざるを得なくなったとき（その場合は「銀行振込→管理者が Supabase で権利を手動付与」を暫定運用にする。コード追加なし）。

### 段階と枠（初期値）

| | ゲスト（未ログイン） | Free（ログイン） | Plus |
| --- | --- | --- | --- |
| 変換・オフライン・PWA・早見表 | 全部 | 全部 | 全部 |
| AI 添削 回数 | 3 回/日 | 30 回/月 | 1,000 回/月（公正利用） |
| AI 添削 文字数 | 500 | 500 | 2,000 |
| モデル | flash-lite | flash-lite | flash（精度優先） |
| 履歴 | 端末 5 件 | 端末 5 件（同期は後回し） | 端末 5 件（同期は後回し） |
| 価格 | 0 | 0 | 6,900₮/月 or 49,000₮/年 |

Plus に「履歴クラウド同期」「用途別トーン（丁寧/カジュアル）」は入れない。価値は明確でも、Simple を崩す方が損。需要が見えたら別計画。

### データモデル（Supabase）

- `entitlements(user_id pk, tier free|plus, status free|active|expired, plan_code, period_end, provider, updated_at)`
- `payment_orders(id, user_id, plan_code, amount_mnt, provider demo|qpay, provider_ref, status pending|paid|expired, expires_at, paid_at, created_at)`
- `ai_usage(id, user_id, route, model, prompt_tokens, output_tokens, latency_ms, ok, error_code, created_at)` — Memorio 0010 をそのまま。月の回数 = 当月行数
- RLS: 本人のみ select、insert はサーバー（service role）
- ゲスト枠: `tm_guest` Cookie に `{day, count}` を HMAC 署名して保存。DB なし

### API とゲート

- `/api/polish`: 変更点は「入口で権利を解決 → 枠と文字数を判定 → 実行後に `ai_usage` へ追記」。応答に `remaining` を足す。上限時は `429 { error: "QUOTA_EXCEEDED", tier, remaining: 0, resetAt }`
- `/api/billing/checkout`（注文作成＋QR）、`/api/billing/confirm`（demo/QPay の支払い確認→権利更新）、`/api/billing/entitlements`（現在の権利と残り回数）— Memorio の 3 本を移植
- QPay 差し替え点は checkout の本体だけ（注文行・金額・期限・応答形は共通）

### 画面（案内）

1. ヘッダー右: ログイン/アカウントメニュー（残り回数メーター・Plus への導線・ログアウト）
2. 添削ボタン脇: **残り回数チップ**（例「今日あと 2 回」「今月あと 27 回」）。0 になった瞬間の理由をその場で見せる
3. **上限到達シート**: ゲスト→「ログインで月 30 回」、Free→「Plus で 1,000 回・2,000 文字」。1 ボタンで次へ
4. `/plus`: 何が増えるか（表）・価格・FAQ（支払い方法、解約、データ）。今の TypeMon の色とトーンのまま
5. `/plus/checkout`: QPay QR・銀行アプリのディープリンク・有効期限。完了で「Plus になりました」1 画面
6. `/login`: Google ボタン＋メール入力の 2 要素だけ。「ログインするとできること」を 3 行

### 実装セクション（コミット単位・順番）

- **S1 基盤**: Supabase プロジェクト作成（ユーザー）、migration 3 本、`lib/supabase/{client,server}.ts`、`lib/plan-constants.ts`（価格・枠・文字数）、`.env.local.example` 更新
- **S2 ログイン**: `AuthProvider`、`/login`、`/auth/callback`、ヘッダーのアカウントメニュー。ゲスト体験は無変更
- **S3 計測とゲート**: `ai_usage` 追記、ゲスト Cookie 枠、`/api/polish` の判定と `remaining`、残り回数チップ、上限到達シート
- **S4 Plus**: `entitlements` 解決、`/plus`、`/plus/checkout`（demo プロバイダ）、confirm、Plus の 2,000 文字・上位モデル切替
- **S5 QPay 接続**: 加盟店承認後、checkout 本体を QPay API に差し替え、コールバック検証
- **S6 リリース前**: `Agents/rules/security.md` の 7 項目を実行（秘密・依存・権限を破る側で試す・入力検証・レート制限・バックアップ）。管理者向けの利用量ロールアップは Memorio の `ai_usage_summary` を流用

各セクションで lint / build / 実画面確認、S1〜S4 は 1 本の PR、S5 は別 PR。

### 触るファイル / 触らないファイル

- 触る: `app/api/polish/route.ts`、`app/layout.tsx`（Provider）、`app/page.tsx`（ヘッダー右）、`components/TypeMonEditor.tsx`（チップとシートの差し込みのみ）、新規 `app/login`・`app/auth/callback`・`app/plus`・`app/plus/checkout`・`app/api/billing/*`・`components/{AuthProvider,AccountMenu,UsageChip,PaywallSheet}.tsx`・`lib/{billing,plan-constants,guest-quota}.ts`・`lib/supabase/*`・`supabase/migrations/*`
- 触らない: `lib/transliterate.ts`、`lib/polish-prompt.ts` の文言、`SettingsModal.tsx`（早見表）、`HistoryPanel.tsx`、PWA / SW、配色・レイアウト

### 完了条件（観測できる形）

1. 未ログインで変換・コピー・保存・早見表・オフライン動作が現状と同じ（Playwright で before/after 一致）
2. ゲストで添削 4 回目が 429 になり、上限到達シートが出る（cURL で `remaining:0`）
3. Google ログイン後、同じ操作で月 30 回まで通り、31 回目が 429（DB の `ai_usage` に 30 行）
4. `/plus/checkout` の demo 支払い確認で `entitlements.tier` が plus になり、2,000 文字が通る・モデル名がログで flash になる
5. 他人のトークンで `entitlements` を読めない（RLS を実際に叩いて確認）
6. `npm run lint` / `npm run build` 通過、`.env.local` 非コミット

## 確定事項（2026-09-15）

1. **価格と枠**: Plus 6,900₮/月・49,000₮/年。Free 30 回/月、Plus 1,000 回/月＋2,000 文字、ゲスト 3 回/日。**エンジンは全段階 Gemini 2.5 Flash-Lite**（原価試算: Plus 最悪ケース ≈ 2,500₮/月、典型 100〜600₮。Flash は原価が価格を超えるため不採用）
2. **決済**: QPay 加盟店申請中。承認までは `provider: 'demo'`、本番公開は承認後
3. **認証**: Google + メールのマジックリンク（パスワードなし）
4. **ゲスト**: 1 日 3 回を残す。使い切った瞬間に「ログインすると月 30 回」の案内を出す
5. **Plus の追加価値（AI 原価ゼロ）**: ① 用途トーン切替（丁寧／ふだん／SNS 短文）② 自分用の綴りルール（変換表のカスタム）。履歴同期は需要を見てから

## S0（追加）: 60 秒タイピングテスト「TypeMon Хурд」

SaaS 化の前に、流入を作る無料ミニゲームを先に出す。`/wpm`（3 モード: Кирилл·TypeMon／Кирилл·шууд／English）、日替わり固定の単語セット、称号（🐫 Тэмээ → ⚡ Өртөөний элч）、推定パーセンタイル、例えの一言、共有 URL `/wpm/r?…` と OG 画像 `/og/wpm`、挑戦リンク `?target=`。DB なし（結果は URL に埋め込み）。Supabase 導入後に `wpm_results` で本物のパーセンタイル・週間ランキング・自己ベスト履歴を足す。
