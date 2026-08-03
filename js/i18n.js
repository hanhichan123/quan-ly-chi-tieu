/* ===========================================================
   i18n.js — Đa ngôn ngữ: Tiếng Việt / English / 日本語

   CÁCH LÀM: tiếng Việt là ngôn ngữ gốc viết thẳng trong mã nguồn.
   Khi chọn ngôn ngữ khác, một MutationObserver sẽ dịch các nút DOM
   ngay khi chúng được thêm vào trang.

   Vì sao chọn cách này: các màn hình vẽ bất đồng bộ (chờ đọc CSDL
   xong mới thêm nút), nên gọi dịch một lần sau khi vẽ sẽ hụt. Quan
   sát DOM thì bắt được hết, mà không phải sửa xuyên các tệp màn hình.

   Từ điển viết dạng bảng 3 cột [việt, anh, nhật] để không bao giờ
   lệch hàng giữa các ngôn ngữ. Chuỗi nào thiếu bản dịch sẽ giữ
   nguyên tiếng Việt — hỏng nhẹ chứ không vỡ giao diện.
   =========================================================== */

App.i18n = (function () {
  'use strict';

  var LS_KEY = 'qlct:lang';
  var LANGS = ['vi', 'en', 'ja'];
  var lang = 'vi';
  var observer = null;

  /* ---------------------------------------------------------
     Bảng từ điển:  [ tiếng Việt, English, 日本語 ]
     --------------------------------------------------------- */
  var TABLE = [
    /* --- Điều hướng & tiêu đề --- */
    ['Tổng quan', 'Overview', '概要'],
    ['Chi tiêu', 'Expenses', '支出'],
    ['Công việc', 'Tasks', 'タスク'],
    ['Thống kê', 'Statistics', '統計'],
    ['Cài đặt', 'Settings', '設定'],
    ['Ngày', 'Day', '日'],
    ['Tuần', 'Week', '週'],
    ['Tháng', 'Month', '月'],
    ['Menu chính', 'Main menu', 'メインメニュー'],
    ['Chọn kỳ xem', 'Select period', '期間を選ぶ'],
    ['Kỳ trước', 'Previous period', '前の期間'],
    ['Kỳ sau', 'Next period', '次の期間'],
    ['Đang tải…', 'Loading…', '読み込み中…'],
    ['Đã về kỳ hiện tại', 'Back to current period', '現在の期間に戻りました'],

    /* --- Chung --- */
    ['Hủy', 'Cancel', 'キャンセル'],
    ['Huỷ', 'Cancel', 'キャンセル'],
    ['Lưu', 'Save', '保存'],
    ['Lưu thay đổi', 'Save changes', '変更を保存'],
    ['Xong', 'Done', '完了'],
    ['Đóng', 'Close', '閉じる'],
    ['Xóa', 'Delete', '削除'],
    ['Xoá', 'Delete', '削除'],
    ['Đồng ý', 'OK', 'OK'],
    ['Đã hiểu', 'Got it', '了解'],
    ['Xác nhận', 'Confirm', '確認'],
    ['Tiếp tục', 'Continue', '次へ'],
    ['Áp dụng', 'Apply', '適用'],
    ['Để sau', 'Later', 'あとで'],
    ['Thôi', 'No thanks', 'やめる'],
    ['Xem lại', 'Review', '見直す'],
    ['Xem tất cả', 'See all', 'すべて見る'],
    ['Chỉnh sửa', 'Edit', '編集'],
    ['Quản lý', 'Manage', '管理'],
    ['Chưa có dữ liệu', 'No data yet', 'データがありません'],
    ['Không đổi', 'No change', '変化なし'],
    ['Chưa bao giờ', 'Never', 'なし'],
    ['Hôm nay', 'Today', '今日'],
    ['Hôm qua', 'Yesterday', '昨日'],
    ['Hôm kia', '2 days ago', 'おととい'],
    ['Ngày mai', 'Tomorrow', '明日'],
    ['Cuối tuần', 'End of week', '週末'],
    ['Cuối tháng', 'End of month', '月末'],
    ['không giới hạn', 'no limit', '上限なし'],
    ['Tìm kiếm', 'Search', '検索'],

    /* --- Tổng quan --- */
    ['Hạn mức chi tiêu', 'Spending limits', '支出の上限'],
    ['Tuần này', 'This week', '今週'],
    ['Tháng này', 'This month', '今月'],
    ['Thu vào', 'Income', '収入'],
    ['Chi ra', 'Spent', '支出'],
    ['Còn lại', 'Left', '残り'],
    ['Tỉ lệ để dành', 'Savings rate', '貯蓄率'],
    ['Nên tiêu mỗi ngày', 'Daily allowance', '1日の目安'],
    ['Chưa đặt hạn mức', 'No limit set', '上限が未設定'],
    ['Đặt hạn mức →', 'Set a limit →', '上限を設定 →'],
    ['Đặt hạn mức để app cảnh báo khi bạn tiêu quá tay.',
      'Set limits so the app can warn you before you overspend.',
      '上限を決めると、使いすぎる前に知らせてくれます。'],
    ['Đã vượt hạn mức!', 'Limit exceeded!', '上限を超えました！'],
    ['Sắp chạm hạn mức', 'Approaching your limit', 'まもなく上限です'],
    ['Nhập nhanh', 'Quick add', 'かんたん入力'],
    ['Chạm để ghi ngay khoản này cho hôm nay. Danh sách tự cập nhật theo thói quen của bạn.',
      'Tap to log this for today. The list updates itself based on your habits.',
      'タップすると今日の記録として登録します。よく使う順に並び替わります。'],
    ['Việc cần làm', 'To do', 'やること'],
    ['Mục tiêu tiết kiệm', 'Savings goals', '貯金目標'],
    ['Giao dịch gần đây', 'Recent transactions', '最近の取引'],
    ['Chưa có giao dịch nào', 'No transactions yet', '取引がまだありません'],
    ['Nhấn nút + màu xanh để ghi khoản đầu tiên.',
      'Tap the blue + button to log your first one.',
      '青い + ボタンから最初の記録を追加しましょう。'],
    ['Nên sao lưu dữ liệu', 'Time to back up', 'バックアップをおすすめします'],
    ['Sao lưu ngay', 'Back up now', '今すぐバックアップ'],

    /* --- Giao dịch --- */
    ['Thêm giao dịch', 'Add transaction', '取引を追加'],
    ['Sửa giao dịch', 'Edit transaction', '取引を編集'],
    ['Thêm giao dịch mới', 'Add a new transaction', '新しい取引を追加'],
    ['− Khoản chi', '− Expense', '− 支出'],
    ['+ Khoản thu', '+ Income', '+ 収入'],
    ['Khoản chi', 'Expense', '支出'],
    ['Khoản thu', 'Income', '収入'],
    ['Số tiền', 'Amount', '金額'],
    ['Hạng mục', 'Category', 'カテゴリー'],
    ['Ghi chú (không bắt buộc)', 'Note (optional)', 'メモ（任意）'],
    ['VD: mua rau ở siêu thị', 'e.g. groceries at the supermarket', '例：スーパーで野菜'],
    ['📷  Đính kèm ảnh hóa đơn', '📷  Attach receipt photo', '📷  レシート写真を添付'],
    ['Gỡ ảnh', 'Remove', '写真を外す'],
    ['Ảnh hóa đơn', 'Receipt photo', 'レシート写真'],
    ['Ảnh hóa đơn đã đính kèm', 'Attached receipt photo', '添付されたレシート写真'],
    ['🗑  Xóa giao dịch này', '🗑  Delete this transaction', '🗑  この取引を削除'],
    ['Xóa giao dịch?', 'Delete transaction?', '取引を削除しますか？'],
    ['Giao dịch này sẽ bị xóa vĩnh viễn khỏi máy.',
      'This transaction will be permanently deleted from your device.',
      'この取引は端末から完全に削除されます。'],
    ['Đã xóa giao dịch', 'Transaction deleted', '取引を削除しました'],
    ['Đã cập nhật', 'Updated', '更新しました'],
    ['Hãy nhập số tiền lớn hơn 0', 'Please enter an amount greater than 0', '0より大きい金額を入力してください'],
    ['Hãy chọn một hạng mục', 'Please pick a category', 'カテゴリーを選んでください'],
    ['Hãy chọn ngày', 'Please pick a date', '日付を選んでください'],
    ['Hãy nhập số tiền', 'Please enter an amount', '金額を入力してください'],
    ['Lưu thất bại', 'Could not save', '保存できませんでした'],
    ['⚠️ Vượt hạn mức', '⚠️ Over the limit', '⚠️ 上限オーバー'],
    ['Vẫn lưu', 'Save anyway', 'それでも保存'],
    ['Vẫn ghi', 'Log it anyway', 'それでも記録'],
    ['Tất cả', 'All', 'すべて'],
    ['Chi', 'Out', '支出'],
    ['Thu', 'In', '収入'],
    ['⚙️ Bộ lọc', '⚙️ Filters', '⚙️ 絞り込み'],
    ['Lọc giao dịch', 'Filter transactions', '取引を絞り込む'],
    ['Xóa lọc', 'Clear filters', '絞り込みを解除'],
    ['Tìm trong ghi chú và tên hạng mục', 'Search notes and category names', 'メモとカテゴリー名から検索'],
    ['— Tất cả hạng mục —', '— All categories —', '— すべてのカテゴリー —'],
    ['Không có kết quả phù hợp', 'No matching results', '該当する結果がありません'],
    ['Thử bỏ bớt bộ lọc.', 'Try removing some filters.', '絞り込みを減らしてみてください。'],
    ['Chưa có hạng mục. Thêm ở tab Cài đặt.', 'No categories yet. Add some under Settings.',
      'カテゴリーがありません。設定から追加してください。'],

    /* --- Công việc --- */
    ['Thêm công việc', 'Add task', 'タスクを追加'],
    ['Sửa công việc', 'Edit task', 'タスクを編集'],
    ['Thêm công việc mới', 'Add a new task', '新しいタスクを追加'],
    ['Thêm công việc đầu tiên', 'Add your first task', '最初のタスクを追加'],
    ['Tên công việc', 'Task name', 'タスク名'],
    ['VD: Đóng tiền điện', 'e.g. Pay the electricity bill', '例：電気代を払う'],
    ['Hạn hoàn thành', 'Due date', '期限'],
    ['Mức ưu tiên', 'Priority', '優先度'],
    ['Lặp lại', 'Repeat', '繰り返し'],
    ['Không lặp', 'No repeat', '繰り返さない'],
    ['Hằng ngày', 'Daily', '毎日'],
    ['Hằng tuần', 'Weekly', '毎週'],
    ['Hằng tháng', 'Monthly', '毎月'],
    ['hằng ngày', 'daily', '毎日'],
    ['hằng tuần', 'weekly', '毎週'],
    ['hằng tháng', 'monthly', '毎月'],
    ['Thường', 'Normal', '通常'],
    ['Quan trọng', 'Important', '重要'],
    ['Gấp', 'Urgent', '緊急'],
    ['Chi tiết thêm', 'More details', '詳細'],
    ['Khi bạn tích hoàn thành, app sẽ tự tạo lần kế tiếp.',
      'When you tick it off, the app creates the next occurrence.',
      '完了にすると、次回分が自動で作られます。'],
    ['🗑  Xóa công việc', '🗑  Delete task', '🗑  タスクを削除'],
    ['Xóa công việc?', 'Delete task?', 'タスクを削除しますか？'],
    ['Đã xóa', 'Deleted', '削除しました'],
    ['Đã thêm công việc', 'Task added', 'タスクを追加しました'],
    ['Hãy nhập tên công việc', 'Please enter a task name', 'タスク名を入力してください'],
    ['Đánh dấu hoàn thành', 'Mark as done', '完了にする'],
    ['Bỏ đánh dấu hoàn thành', 'Mark as not done', '未完了に戻す'],
    ['Đang mở', 'Open', '未完了'],
    ['Quá hạn', 'Overdue', '期限切れ'],
    ['Đã xong', 'Done', '完了'],
    ['⏰ Quá hạn', '⏰ Overdue', '⏰ 期限切れ'],
    ['📌 Hôm nay', '📌 Today', '📌 今日'],
    ['🗓 Còn lại trong tuần', '🗓 Rest of this week', '🗓 今週の残り'],
    ['📆 Còn lại trong tháng', '📆 Rest of this month', '📆 今月の残り'],
    ['🔮 Sau này', '🔮 Later', '🔮 それ以降'],
    ['📥 Không đặt hạn', '📥 No due date', '📥 期限なし'],
    ['Chưa có công việc nào', 'No tasks yet', 'タスクがまだありません'],
    ['Nhấn nút ＋ ở góc trên để thêm việc cần làm.', 'Tap ＋ at the top to add something to do.',
      '右上の ＋ からやることを追加できます。'],
    ['Xong hết việc rồi!', 'All caught up!', 'すべて完了しました！'],
    ['Không còn công việc nào đang mở.', 'Nothing left on your plate.', '未完了のタスクはありません。'],
    ['🗑 Xóa hết việc đã xong', '🗑 Clear all completed tasks', '🗑 完了したタスクを全部消す'],
    ['Thao tác này không hoàn tác được.', 'This cannot be undone.', 'この操作は取り消せません。'],
    ['Xóa hết', 'Delete all', 'すべて削除'],
    ['Đã dọn sạch', 'All cleared', '整理しました'],

    /* --- Thống kê --- */
    ['Thu nhập', 'Income', '収入'],
    ['Theo hạng mục', 'By category', 'カテゴリー別'],
    ['Tổng chi', 'Total spent', '支出合計'],
    ['Tổng thu', 'Total income', '収入合計'],
    ['Trung bình/ngày', 'Daily average', '1日平均'],
    ['Số giao dịch', 'Transactions', '取引件数'],
    ['Số ngày', 'Days', '日数'],
    ['Theo ngày trong tuần', 'By day of week', '曜日別'],
    ['Theo ngày trong tháng', 'By day of month', '日別'],
    ['Theo tháng', 'By month', '月別'],
    ['14 ngày gần đây', 'Last 14 days', '直近14日'],
    ['Xu hướng 6 tháng', '6-month trend', '6か月の推移'],
    ['Chạm vào cột để xem số tiền', 'Tap a bar to see the amount', '棒をタップすると金額が出ます'],
    ['Chạm vào lát màu để xem số chi tiết.', 'Tap a slice to see exact figures.',
      '色の部分をタップすると詳しい数字が出ます。'],
    ['┄ hạn mức ngày', '┄ daily limit', '┄ 1日の上限'],
    ['Hạn mức theo hạng mục (tháng)', 'Per-category monthly limits', 'カテゴリー別の月上限'],
    ['Chưa có dữ liệu trong kỳ này', 'No data for this period', 'この期間のデータがありません'],
    ['Ghi vài giao dịch rồi quay lại xem biểu đồ nhé.', 'Log a few transactions and the charts will fill in.',
      'いくつか記録するとグラフが表示されます。'],

    /* --- Phương thức thanh toán --- */
    ['Phương thức thanh toán', 'Payment methods', '支払い方法'],
    ['Thanh toán bằng', 'Paid with', '支払い方法'],
    ['Theo phương thức thanh toán', 'By payment method', '支払い方法別'],
    ['Thêm phương thức thanh toán', 'Add a payment method', '支払い方法を追加'],
    ['Thêm phương thức', 'Add method', '追加'],
    ['Sửa phương thức', 'Edit method', '支払い方法を編集'],
    ['Tên phương thức', 'Method name', '支払い方法の名前'],
    ['Tên tiếng Nhật (không bắt buộc)', 'Japanese name (optional)', '日本語名（任意）'],
    ['Ghi để dễ đối chiếu với hóa đơn và app ngân hàng.',
      'Handy for matching receipts and banking apps.',
      'レシートや銀行アプリと照らし合わせるときに便利です。'],
    ['🗑  Xóa phương thức', '🗑  Delete method', '🗑  支払い方法を削除'],
    ['Xóa phương thức?', 'Delete method?', '支払い方法を削除しますか？'],
    ['Ẩn phương thức?', 'Hide method?', '支払い方法を隠しますか？'],
    ['Đã xóa phương thức', 'Method deleted', '削除しました'],
    ['Đã ẩn phương thức', 'Method hidden', '非表示にしました'],
    ['Đã lưu phương thức', 'Method saved', '保存しました'],
    ['Hãy nhập tên phương thức', 'Please enter a method name', '支払い方法の名前を入力してください'],
    ['Không ghi phương thức', 'No method recorded', '支払い方法なし'],
    ['Phương thức này chưa có giao dịch nào, sẽ được xóa hẳn.',
      'This method has no transactions and will be removed entirely.',
      'この支払い方法は取引がないため、完全に削除されます。'],
    ['Danh sách mặc định theo các hình thức đang phổ biến ở Nhật. Bạn sửa hoặc thêm tùy ý.',
      'The defaults reflect what is common in Japan. Edit or add as you like.',
      '日本でよく使われる方法を初期設定にしています。自由に編集・追加できます。'],
    ['— Tất cả phương thức —', '— All payment methods —', '— すべての支払い方法 —'],
    ['Tiền mặt', 'Cash', '現金'],
    ['Thẻ tín dụng', 'Credit card', 'クレジットカード'],
    ['Thẻ ghi nợ', 'Debit card', 'デビットカード'],
    ['Chuyển khoản', 'Bank transfer', '銀行振込'],
    ['Trừ tự động', 'Direct debit', '口座振替'],
    ['Trả tại konbini', 'Convenience store', 'コンビニ払い'],
    ['Rakuten Pay', 'Rakuten Pay', '楽天ペイ'],
    ['d Payment', 'd Payment', 'd払い'],
    ['MerPay', 'MerPay', 'メルペイ'],
    ['VD: PayPay', 'e.g. PayPay', '例：PayPay'],
    ['VD: ペイペイ', 'e.g. ペイペイ', '例：ペイペイ'],

    /* --- Cài đặt --- */
    ['Tiền bạc', 'Money', 'お金'],
    ['Giao diện & cảnh báo', 'Appearance & alerts', '表示と通知'],
    ['Bảo mật', 'Security', 'セキュリティ'],
    ['Dữ liệu của bạn', 'Your data', 'あなたのデータ'],
    ['Về ứng dụng', 'About', 'このアプリについて'],
    ['Hạn mức ngày / tuần / tháng', 'Daily / weekly / monthly limits', '日・週・月の上限'],
    ['Hạn mức theo hạng mục', 'Per-category limits', 'カテゴリー別の上限'],
    ['Đơn vị tiền tệ', 'Currency', '通貨'],
    ['Hạng mục thu / chi', 'Income & expense categories', '収支のカテゴリー'],
    ['Khoản thu/chi định kỳ', 'Recurring transactions', '定期的な収支'],
    ['Tiền nhà, internet, lương…', 'Rent, internet, salary…', '家賃・ネット・給料など'],
    ['Đặt đích và theo dõi tiến độ', 'Set a target and track progress', '目標を決めて進み具合を見る'],
    ['Chế độ màu', 'Colour mode', '配色'],
    ['Theo hệ thống', 'Match system', '端末に合わせる'],
    ['Luôn sáng', 'Always light', '常にライト'],
    ['Luôn tối', 'Always dark', '常にダーク'],
    ['Ngôn ngữ', 'Language', '言語'],
    ['Tuần bắt đầu từ', 'Week starts on', '週の始まり'],
    ['Thứ hai', 'Monday', '月曜日'],
    ['Chủ nhật', 'Sunday', '日曜日'],
    ['Cảnh báo vàng khi đạt', 'Amber warning at', '黄色の警告ライン'],
    ['Thanh hạn mức chuyển vàng khi chi tiêu đạt mức này.',
      'The limit bar turns amber once spending reaches this level.',
      'この割合に達すると上限バーが黄色になります。'],
    ['Hỏi lại khi vượt hạn mức', 'Ask before exceeding a limit', '上限を超えるとき確認する'],
    ['Hiện hộp xác nhận trước khi lưu khoản làm vượt mức.',
      'Show a confirmation before saving a transaction that goes over.',
      '上限を超える記録を保存する前に確認画面を出します。'],
    ['Thông báo hệ thống', 'System notifications', '端末の通知'],
    ['Nhắc bạn khi mở app nếu kỳ trước đã vượt hạn mức.',
      'Remind you on launch if you went over during the last period.',
      '前の期間で上限を超えていたら、起動時に知らせます。'],
    ['Đã bật thông báo', 'Notifications enabled', '通知を有効にしました'],
    ['Bạn đã từ chối quyền thông báo', 'You declined the notification permission', '通知が許可されませんでした'],
    ['Trình duyệt này không hỗ trợ thông báo', 'This browser does not support notifications',
      'このブラウザは通知に対応していません'],

    ['Khoá ứng dụng', 'App lock', 'アプリロック'],
    ['Đặt mã PIN để người khác không xem được', 'Set a PIN so others cannot look through your finances',
      'PINを設定すると他の人に見られません'],
    ['Khoá ứng dụng bằng mã PIN', 'Lock the app with a PIN', 'PINでアプリをロック'],
    ['Hỏi mã PIN mỗi khi mở app', 'Ask for a PIN every time the app opens', '起動のたびにPINを求めます'],
    ['Đang bật', 'On', '有効'],
    ['Đặt mã PIN', 'Set a PIN', 'PINを設定'],
    ['Nhập mã PIN', 'Enter your PIN', 'PINを入力'],
    ['Nhập mã PIN mới', 'Enter a new PIN', '新しいPINを入力'],
    ['Nhập lại mã PIN', 'Re-enter the PIN', 'PINをもう一度入力'],
    ['Gõ lại đúng mã vừa rồi để xác nhận.', 'Type the same code again to confirm.',
      '確認のため同じ番号を入力してください。'],
    ['Bật khoá', 'Turn on lock', 'ロックを有効にする'],
    ['🔑  Đổi mã PIN', '🔑  Change PIN', '🔑  PINを変更'],
    ['Tự khoá lại khi rời app', 'Auto-lock when you leave', '離れたら自動でロック'],
    ['Ngay lập tức', 'Immediately', 'すぐに'],
    ['Sau 1 phút', 'After 1 minute', '1分後'],
    ['Sau 5 phút', 'After 5 minutes', '5分後'],
    ['Sau 15 phút', 'After 15 minutes', '15分後'],
    ['Sau 1 giờ', 'After 1 hour', '1時間後'],
    ['Mở khoá bằng vân tay / khuôn mặt', 'Unlock with fingerprint / face', '指紋・顔認証で解除'],
    ['Mở khoá bằng vân tay', 'Unlock with fingerprint', '指紋で解除'],
    ['Vẫn giữ mã PIN làm phương án dự phòng', 'Your PIN still works as a fallback', 'PINも引き続き使えます'],
    ['Đã bật mở khoá bằng vân tay', 'Biometric unlock enabled', '生体認証を有効にしました'],
    ['Đã bật khoá ứng dụng', 'App lock enabled', 'アプリロックを有効にしました'],
    ['Đã tắt khoá', 'App lock turned off', 'ロックを解除しました'],
    ['Đã tắt', 'Turned off', '無効にしました'],
    ['Tắt khoá ứng dụng?', 'Turn off the app lock?', 'アプリロックを解除しますか？'],
    ['Ai cầm máy bạn cũng mở xem được toàn bộ chi tiêu.',
      'Anyone holding your phone will be able to see all your spending.',
      '端末を手にした人が支出をすべて見られるようになります。'],
    ['Tắt khoá', 'Turn off', '解除する'],
    ['Quên mã PIN?', 'Forgot your PIN?', 'PINを忘れた場合'],
    ['Quên mã PIN', 'Forgot PIN', 'PINを忘れた場合'],
    ['Quên PIN là mất dữ liệu', 'Forget the PIN and the data is gone', 'PINを忘れるとデータは戻せません'],
    ['Hai lần nhập không khớp, thử lại', 'The two entries did not match, try again', '2回の入力が一致しません'],
    ['Không bật được khoá', 'Could not enable the lock', 'ロックを有効にできませんでした'],
    ['Không đăng ký được', 'Registration failed', '登録できませんでした'],
    ['Bạn đã huỷ hoặc thiết bị từ chối.', 'You cancelled, or the device declined.',
      'キャンセルされたか、端末が拒否しました。'],
    ['Đang chờ xác thực…', 'Waiting for authentication…', '認証を待っています…'],
    ['Không nhận diện được, hãy nhập mã PIN.', 'Not recognised — please enter your PIN.',
      '認識できませんでした。PINを入力してください。'],
    ['Xoá một chữ số', 'Delete one digit', '1文字消す'],
    ['Màn hình khoá', 'Lock screen', 'ロック画面'],
    ['Đây là lớp che, không phải mã hoá', 'This is a screen, not encryption', 'これは目隠しであり、暗号化ではありません'],

    ['Xuất file sao lưu (JSON)', 'Export backup (JSON)', 'バックアップを書き出す（JSON）'],
    ['Đủ mọi thứ, kể cả ảnh hóa đơn', 'Everything, receipt photos included', 'レシート写真も含めてすべて'],
    ['Xuất giao dịch ra CSV', 'Export transactions as CSV', '取引をCSVで書き出す'],
    ['Mở được bằng Excel', 'Opens in Excel', 'Excelで開けます'],
    ['Nhập lại từ file sao lưu', 'Restore from a backup file', 'バックアップから復元'],
    ['Ghi đè toàn bộ dữ liệu hiện tại', 'Overwrites everything currently stored', '現在のデータをすべて上書きします'],
    ['Xóa toàn bộ dữ liệu', 'Erase all data', 'すべてのデータを消す'],
    ['Không khôi phục được', 'Cannot be undone', '元に戻せません'],
    ['Nhắc sao lưu', 'Backup reminder', 'バックアップの通知'],
    ['Không nhắc', 'Never', '通知しない'],
    ['Mỗi tuần', 'Weekly', '毎週'],
    ['Mỗi 2 tuần', 'Every 2 weeks', '2週間ごと'],
    ['Mỗi tháng', 'Monthly', '毎月'],
    ['App sẽ nhắc ở màn Tổng quan khi đã lâu chưa sao lưu và có giao dịch mới.',
      'The app will remind you on the Overview screen when a backup is overdue.',
      'しばらくバックアップしていないと概要画面でお知らせします。'],
    ['Sao lưu gần nhất', 'Last backup', '最後のバックアップ'],
    ['Dữ liệu chỉ nằm trong máy bạn', 'Your data never leaves this device', 'データは端末の中だけにあります'],
    ['App không gửi gì lên mạng. Nếu bạn gỡ app hoặc xóa dữ liệu trình duyệt, dữ liệu sẽ mất — hãy xuất file sao lưu định kỳ.',
      'The app sends nothing over the network. Uninstalling it or clearing your browser data will erase everything — export a backup regularly.',
      'ネットへ何も送信しません。アプリを削除したりブラウザのデータを消すとすべて失われます。定期的にバックアップしてください。'],
    ['Đang dùng bộ nhớ dự phòng (localStorage) — dung lượng hạn chế, nên hạn chế đính kèm ảnh và nhớ xuất sao lưu thường xuyên.',
      'Running on fallback storage (localStorage) — space is limited, so go easy on photos and back up often.',
      '予備の保存領域（localStorage）で動作中です。容量が少ないので写真は控えめに、こまめにバックアップしてください。'],
    ['Đọc chính sách bảo mật →', 'Read the privacy policy →', 'プライバシーポリシーを読む →'],
    ['Khôi phục dữ liệu?', 'Restore data?', 'データを復元しますか？'],
    ['Ghi đè và khôi phục', 'Overwrite and restore', '上書きして復元'],
    ['Không nhập được', 'Import failed', '読み込めませんでした'],
    ['Xóa toàn bộ dữ liệu?', 'Erase all data?', 'すべてのデータを消しますか？'],
    ['Tôi hiểu, xóa hết', 'I understand, erase it', '理解しました、消します'],
    ['Chắc chắn chưa?', 'Are you sure?', '本当によろしいですか？'],
    ['Đây là bước xác nhận cuối cùng. Sau bước này không khôi phục lại được.',
      'This is the final confirmation. There is no way back after this.',
      '最終確認です。これ以降は元に戻せません。'],
    ['Đã xóa toàn bộ dữ liệu', 'All data erased', 'すべてのデータを消しました'],

    ['Phiên bản', 'Version', 'バージョン'],
    ['Nơi lưu dữ liệu', 'Storage', '保存先'],
    ['Chạy offline', 'Offline mode', 'オフライン動作'],
    ['Đã bật ✓', 'Enabled ✓', '有効 ✓'],
    ['Chưa bật', 'Not enabled', '無効'],
    ['IndexedDB (tốt)', 'IndexedDB (good)', 'IndexedDB（良好）'],
    ['localStorage (dự phòng)', 'localStorage (fallback)', 'localStorage（予備）'],
    ['📲  Cách cài vào màn hình chính', '📲  How to install on your home screen', '📲  ホーム画面への追加方法'],
    ['Cài vào màn hình chính', 'Install on home screen', 'ホーム画面に追加'],

    /* --- Hạng mục --- */
    ['Hạng mục CHI', 'EXPENSE categories', '支出カテゴリー'],
    ['Hạng mục THU', 'INCOME categories', '収入カテゴリー'],
    ['Thêm hạng mục', 'Add category', 'カテゴリーを追加'],
    ['Sửa hạng mục', 'Edit category', 'カテゴリーを編集'],
    ['Thêm hạng mục chi', 'Add expense category', '支出カテゴリーを追加'],
    ['Thêm hạng mục thu', 'Add income category', '収入カテゴリーを追加'],
    ['Tên hạng mục', 'Category name', 'カテゴリー名'],
    ['Biểu tượng', 'Icon', 'アイコン'],
    ['Màu', 'Colour', '色'],
    ['VD: Cà phê', 'e.g. Coffee', '例：コーヒー'],
    ['Chạm để sửa tên, biểu tượng, màu', 'Tap to change name, icon or colour', 'タップで名前・アイコン・色を変更'],
    ['🗑  Xóa hạng mục', '🗑  Delete category', '🗑  カテゴリーを削除'],
    ['Xóa hạng mục?', 'Delete category?', 'カテゴリーを削除しますか？'],
    ['Ẩn hạng mục?', 'Hide category?', 'カテゴリーを隠しますか？'],
    ['Ẩn đi', 'Hide it', '隠す'],
    ['Đã ẩn hạng mục', 'Category hidden', '非表示にしました'],
    ['Đã xóa hạng mục', 'Category deleted', '削除しました'],
    ['Đã lưu hạng mục', 'Category saved', '保存しました'],
    ['Hãy nhập tên hạng mục', 'Please enter a category name', 'カテゴリー名を入力してください'],
    ['Hạng mục này chưa có giao dịch nào, sẽ được xóa hẳn.',
      'This category has no transactions and will be removed entirely.',
      'このカテゴリーは取引がないため、完全に削除されます。'],

    ['Đi chợ / Ăn uống', 'Groceries / Food', '食費'],
    ['Tiền nhà', 'Rent', '家賃'],
    ['Xăng xe / Đi lại', 'Fuel / Transport', '交通費'],
    ['Điện nước ga', 'Utilities', '光熱費'],
    ['Điện thoại / Net', 'Phone / Internet', '通信費'],
    ['Y tế', 'Health', '医療費'],
    ['Mua sắm', 'Shopping', '買い物'],
    ['Giải trí', 'Entertainment', '娯楽'],
    ['Học tập', 'Education', '教育費'],
    ['Bảo hiểm / Thuế', 'Insurance / Tax', '保険・税金'],
    ['Gửi về nhà', 'Money home', '仕送り'],
    ['Khác', 'Other', 'その他'],
    ['Lương', 'Salary', '給料'],
    ['Làm thêm', 'Side work', 'アルバイト'],
    ['Thưởng', 'Bonus', 'ボーナス'],
    ['Thu khác', 'Other income', 'その他の収入'],
    ['Không rõ', 'Unknown', '不明'],

    /* --- Hạn mức --- */
    ['Đặt hạn mức chi tiêu', 'Set spending limits', '支出の上限を決める'],
    ['Hạn mức mỗi NGÀY', 'DAILY limit', '1日の上限'],
    ['Hạn mức mỗi TUẦN', 'WEEKLY limit', '1週間の上限'],
    ['Hạn mức mỗi THÁNG', 'MONTHLY limit', '1か月の上限'],
    ['Tổng chi trong 1 ngày', 'Total spend in one day', '1日の支出合計'],
    ['Tính theo tháng dương lịch', 'Based on the calendar month', '暦月で計算します'],
    ['🧮  Tính ngày & tuần từ hạn mức tháng', '🧮  Derive daily & weekly from the monthly limit',
      '🧮  月の上限から日・週を計算'],
    ['Hãy nhập hạn mức tháng trước', 'Enter the monthly limit first', '先に月の上限を入力してください'],
    ['Đã điền gợi ý, bạn có thể sửa lại', 'Suggestions filled in — feel free to adjust', '目安を入れました。調整できます'],
    ['Đã lưu hạn mức', 'Limits saved', '上限を保存しました'],
    ['Đã lưu', 'Saved', '保存しました'],
    ['Đặt trần chi tiêu hằng tháng cho từng hạng mục. Để trống nghĩa là không giới hạn.',
      'Set a monthly ceiling per category. Leave blank for no limit.',
      'カテゴリーごとに月の上限を決めます。空欄なら上限なしです。'],
    ['Chưa đặt hạn mức riêng nào', 'No per-category limits set', 'カテゴリー別の上限は未設定'],
    ['Chưa đặt — chạm để thiết lập', 'Not set — tap to configure', '未設定 — タップして設定'],

    /* --- Định kỳ --- */
    ['Khoản định kỳ đến hạn', 'Recurring items due', '定期的な収支の期日'],
    ['Thêm khoản định kỳ', 'Add a recurring item', '定期的な収支を追加'],
    ['Sửa khoản định kỳ', 'Edit recurring item', '定期的な収支を編集'],
    ['＋  Thêm khoản định kỳ', '＋  Add a recurring item', '＋  定期的な収支を追加'],
    ['Xóa khoản định kỳ?', 'Delete recurring item?', '削除しますか？'],
    ['🗑  Xóa khoản định kỳ', '🗑  Delete recurring item', '🗑  定期的な収支を削除'],
    ['Chưa có khoản định kỳ', 'No recurring items yet', '定期的な収支はまだありません'],
    ['Bỏ chọn những khoản bạn chưa thực sự chi/thu.', 'Untick anything you have not actually paid or received.',
      '実際に支払っていないものはチェックを外してください。'],
    ['Ghi vào sổ', 'Add to the ledger', '記録する'],
    ['Đã bỏ qua', 'Skipped', 'スキップしました'],
    ['Ghi thất bại', 'Could not save', '記録できませんでした'],
    ['Loại', 'Type', '種類'],
    ['Tên gọi', 'Label', '名称'],
    ['VD: Tiền nhà tháng', 'e.g. Monthly rent', '例：毎月の家賃'],
    ['Tần suất', 'Frequency', '頻度'],
    ['Vào thứ', 'On', '曜日'],
    ['Vào ngày trong tháng', 'Day of the month', '毎月の日にち'],
    ['Nhập 31 nếu muốn luôn rơi vào ngày cuối tháng.', 'Enter 31 to always land on the last day of the month.',
      '月末にしたい場合は31を入れてください。'],
    ['Tắt để tạm dừng mà không xóa', 'Switch off to pause without deleting', '削除せず一時停止できます'],
    ['Đã lưu khoản định kỳ', 'Recurring item saved', '保存しました'],
    ['Hãy chọn hạng mục', 'Please pick a category', 'カテゴリーを選んでください'],
    ['đang tắt', 'paused', '停止中'],

    /* --- Mục tiêu --- */
    ['Thêm mục tiêu', 'Add a goal', '目標を追加'],
    ['Sửa mục tiêu', 'Edit goal', '目標を編集'],
    ['＋  Thêm mục tiêu', '＋  Add a goal', '＋  目標を追加'],
    ['Xóa mục tiêu?', 'Delete goal?', '目標を削除しますか？'],
    ['🗑  Xóa mục tiêu', '🗑  Delete goal', '🗑  目標を削除'],
    ['Chưa có mục tiêu nào', 'No goals yet', '目標がまだありません'],
    ['Tên mục tiêu', 'Goal name', '目標の名前'],
    ['VD: Mua xe máy', 'e.g. Buy a motorbike', '例：バイクを買う'],
    ['Đã để dành được', 'Saved so far', '貯まった金額'],
    ['Hạn hoàn thành (không bắt buộc)', 'Target date (optional)', '目標日（任意）'],
    ['Nạp vào mục tiêu', 'Add to goal', '目標に入金'],
    ['＋ Nạp', '＋ Add', '＋ 入金'],
    ['Nạp', 'Add', '入金'],
    ['Nhập số âm nếu bạn muốn rút bớt ra.', 'Enter a negative number to take money back out.',
      '取り崩す場合はマイナスの数値を入れてください。'],
    ['Đã lưu mục tiêu', 'Goal saved', '目標を保存しました'],
    ['Số tiền cần có phải lớn hơn 0', 'The target must be greater than 0', '目標額は0より大きくしてください'],
    ['Hãy nhập tên mục tiêu', 'Please enter a goal name', '目標の名前を入力してください'],
    ['🎉 Đã hoàn thành!', '🎉 Goal reached!', '🎉 達成しました！'],
    ['đã quá hạn', 'past the target date', '目標日を過ぎています'],

    /* --- Cập nhật --- */
    ['Có bản cập nhật', 'Update available', 'アップデートがあります'],
    ['Phiên bản mới của app đã tải xong. Tải lại để dùng bản mới?',
      'A new version has finished downloading. Reload to use it?',
      '新しいバージョンの準備ができました。読み込み直しますか？'],
    ['Tải lại', 'Reload', '読み込み直す'],
    ['Vượt hạn mức chi tiêu', 'Spending limit exceeded', '支出が上限を超えました']
  ];

  /* Dựng từ điển tra nhanh từ bảng trên */
  var DICT = { en: {}, ja: {} };
  TABLE.forEach(function (row) {
    if (row[1]) DICT.en[row[0]] = row[1];
    if (row[2]) DICT.ja[row[0]] = row[2];
  });

  /* ---------------------------------------------------------
     Quy tắc cho chuỗi ghép động (có số, có tiền)
     [biểu thức, bản tiếng Anh, bản tiếng Nhật]
     --------------------------------------------------------- */
  var PATTERN_TABLE = [
    [/^Còn lại (.+)$/, 'Left: $1', '残り $1'],
    [/^Còn (\d+) ngày$/, '$1 days left', 'あと$1日'],
    [/^Quá hạn (\d+) ngày$/, '$1 days overdue', '$1日超過'],
    [/^⚠️ Vượt (.+)$/, '⚠️ Over by $1', '⚠️ $1 超過'],
    [/^⚠️ Sắp hết, còn (.+)$/, '⚠️ Almost gone — $1 left', '⚠️ 残り $1'],
    [/^Vượt (.+)$/, 'Over by $1', '$1 超過'],
    [/^còn (\d+) ngày$/, '$1 days to go', 'あと$1日'],
    [/^Năm (\d+)$/, 'Year $1', '$1年'],
    [/^(\d+) giao dịch$/, '$1 transactions', '$1件の取引'],
    [/^(\d+) giao dịch \(lọc từ (\d+)\)$/, '$1 of $2 transactions', '$2件中 $1件'],
    [/^Đã ghi (\d+) khoản định kỳ$/, 'Logged $1 recurring items', '定期的な収支を$1件記録しました'],
    [/^Có (\d+) khoản định kỳ đến hạn$/, '$1 recurring items are due', '期日の来た定期的な収支が$1件あります'],
    [/^Mỗi tháng vào ngày (\d+)$/, 'Monthly on day $1', '毎月$1日'],
    [/^Mỗi tuần vào (.+)$/, 'Weekly on $1', '毎週$1'],
    [/^Trung bình (.+)\/tháng$/, 'Average $1/month', '月平均 $1'],
    [/^(\d+) hạng mục có hạn mức riêng$/, '$1 categories have their own limit', '$1件のカテゴリーに上限あり'],
    [/^(\d+) hạng mục chi, (\d+) hạng mục thu$/, '$1 expense, $2 income categories', '支出$1件・収入$2件'],
    [/^(\d+) phương thức đang dùng$/, '$1 methods in use', '$1件の支払い方法'],
    [/^Có (\d+) giao dịch đang dùng phương thức này\. (.+)$/,
      '$1 transactions use this method. $2', 'この支払い方法は$1件の取引で使われています。$2'],
    [/^Có (\d+) giao dịch đang dùng hạng mục này\. (.+)$/,
      '$1 transactions use this category. $2', 'このカテゴリーは$1件の取引で使われています。$2'],
    [/^Mã PIN không đúng \((\d+)\/(\d+)\)$/, 'Wrong PIN ($1/$2)', 'PINが違います（$1/$2）'],
    [/^Sai quá nhiều lần\. Chờ (\d+) giây rồi thử lại\.$/,
      'Too many attempts. Wait $1 seconds.', '間違いが多すぎます。$1秒お待ちください。'],
    [/^Từ (\d+) đến (\d+) chữ số\.$/, 'Between $1 and $2 digits.', '$1〜$2桁で入力してください。'],
    [/^Đã lưu (.+)$/, 'Saved $1', '$1 を保存しました'],
    [/^Đã ghi (.+)$/, 'Logged $1', '$1 を記録しました'],
    [/^Đã nạp (.+)$/, 'Added $1', '$1 を入金しました'],
    [/^Đã rút (.+)$/, 'Withdrew $1', '$1 を引き出しました'],
    [/^Đã tải về (\d+) dòng$/, 'Downloaded $1 rows', '$1行を書き出しました'],
    [/^Đã tải về (.+)$/, 'Downloaded $1', '$1 を書き出しました'],
    [/^Đã khôi phục (\d+) giao dịch$/, 'Restored $1 transactions', '$1件の取引を復元しました'],
    [/^Đã đính kèm ảnh \((.+)\)$/, 'Photo attached ($1)', '写真を添付しました（$1）'],
    [/^Đã đổi sang (.+)$/, 'Switched to $1', '$1 に変更しました'],
    [/^Đã quy đổi sang (.+)$/, 'Converted to $1', '$1 に換算しました'],
    [/^Khác \((\d+) mục\)$/, 'Other ($1 items)', 'その他（$1件）'],
    [/^(\d+) ngày trước$/, '$1 days ago', '$1日前'],
    [/^Hiện (\d+) việc đã xong$/, 'Show $1 completed tasks', '完了した$1件を表示'],
    [/^Ẩn (\d+) việc đã xong$/, 'Hide $1 completed tasks', '完了した$1件を隠す'],
    [/^Xóa (\d+) việc đã xong\?$/, 'Delete $1 completed tasks?', '完了した$1件を削除しますか？'],
    [/^Đã tạo lần kế tiếp: (.+)$/, 'Next occurrence created: $1', '次回分を作成しました：$1'],
    [/^Sẽ nhắc lại sau (\d+) ngày$/, 'Will remind you again in $1 days', '$1日後にまたお知らせします'],
    [/^Tiến độ (\d+)%$/, 'Progress $1%', '進捗 $1%'],
    [/^Màu (\d+)$/, 'Colour $1', '色 $1'],
    [/^Số tiền \((\w+)\)$/, 'Amount ($1)', '金額（$1）'],
    [/^Số tiền cần có \((\w+)\)$/, 'Target amount ($1)', '目標額（$1）'],
    [/^Nạp thêm \((\w+)\)$/, 'Add more ($1)', '入金額（$1）'],
    [/^Hạn mức mỗi NGÀY \((\w+)\)$/, 'DAILY limit ($1)', '1日の上限（$1）'],
    [/^Hạn mức mỗi TUẦN \((\w+)\)$/, 'WEEKLY limit ($1)', '1週間の上限（$1）'],
    [/^Hạn mức mỗi THÁNG \((\w+)\)$/, 'MONTHLY limit ($1)', '1か月の上限（$1）'],
    [/^Tính theo tuần bắt đầu từ (.+)$/, 'Based on weeks starting $1', '週の始まりは$1です'],
    [/^(\d+) tệp$/, '$1 files', '$1ファイル']
  ];

  /* ---------------------------------------------------------
     Dịch một chuỗi
     --------------------------------------------------------- */
  function translate(text) {
    if (lang === 'vi') return text;
    var trimmed = String(text == null ? '' : text).trim();
    if (!trimmed) return text;

    var col = lang === 'ja' ? 2 : 1;
    var hit = DICT[lang] ? DICT[lang][trimmed] : undefined;

    if (hit === undefined) {
      for (var i = 0; i < PATTERN_TABLE.length; i++) {
        var m = trimmed.match(PATTERN_TABLE[i][0]);
        if (m) {
          var tpl = PATTERN_TABLE[i][col];
          if (!tpl) break;
          hit = tpl.replace(/\$(\d)/g, function (_, n) { return m[+n] || ''; });
          break;
        }
      }
    }
    if (hit === undefined) return text;

    // Giữ nguyên khoảng trắng hai đầu để không phá bố cục
    var lead = text.match(/^\s*/)[0];
    var tail = text.match(/\s*$/)[0];
    return lead + hit + tail;
  }

  /** Dùng trong mã: chọn chuỗi theo ngôn ngữ hiện tại */
  function pick(vi, en, ja) {
    if (lang === 'ja') return ja !== undefined ? ja : (en !== undefined ? en : vi);
    if (lang === 'en') return en !== undefined ? en : vi;
    return vi;
  }

  /* ---------------------------------------------------------
     Dịch cả một nhánh DOM
     --------------------------------------------------------- */
  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1 };

  function translateTree(root) {
    if (lang === 'vi' || !root) return;

    if (root.nodeType === 3) {
      var t = translate(root.nodeValue);
      if (t !== root.nodeValue) root.nodeValue = t;
      return;
    }
    if (root.nodeType !== 1) return;
    if (SKIP_TAGS[root.tagName]) return;

    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return (n.parentNode && SKIP_TAGS[n.parentNode.tagName])
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (node) {
      var v = translate(node.nodeValue);
      if (v !== node.nodeValue) node.nodeValue = v;
    });

    // Thuộc tính (chữ gợi ý trong ô nhập, nhãn cho trình đọc màn hình…)
    var els = [root].concat(Array.prototype.slice.call(root.querySelectorAll('*')));
    els.forEach(function (el) {
      if (el.nodeType !== 1) return;
      ATTRS.forEach(function (a) {
        if (!el.hasAttribute(a)) return;
        var v = translate(el.getAttribute(a));
        if (v !== el.getAttribute(a)) el.setAttribute(a, v);
      });
    });
  }

  /* ---------------------------------------------------------
     Theo dõi DOM: dịch ngay khi nút mới được thêm vào
     Chỉ nghe childList -> việc sửa nội dung text không tự kích hoạt lại.
     --------------------------------------------------------- */
  function startObserver() {
    if (observer || !window.MutationObserver) return;
    observer = new MutationObserver(function (records) {
      if (lang === 'vi') return;
      records.forEach(function (r) {
        Array.prototype.forEach.call(r.addedNodes, function (node) {
          translateTree(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserver() {
    if (observer) { observer.disconnect(); observer = null; }
  }

  /* ---------------------------------------------------------
     Đổi ngôn ngữ
     --------------------------------------------------------- */
  var TITLES = { vi: 'Quản lý Chi tiêu', en: 'Expense Manager', ja: '家計簿' };

  function setLang(next) {
    lang = (LANGS.indexOf(next) >= 0) ? next : 'vi';
    try { localStorage.setItem(LS_KEY, lang); } catch (e) { /* bị chặn thì thôi */ }
    document.documentElement.lang = lang;
    document.title = TITLES[lang] || TITLES.vi;
    if (lang === 'vi') {
      stopObserver();
    } else {
      startObserver();
      // Thanh tab và thanh chọn kỳ là HTML tĩnh, không bao giờ được thêm lại
      // nên bộ quan sát không thấy. Dịch cả trang một lần ngay lúc này.
      if (document.body) translateTree(document.body);
    }
    return lang;
  }

  function init(saved) {
    var l = saved;
    if (!l) { try { l = localStorage.getItem(LS_KEY); } catch (e) { l = null; } }
    setLang(l || 'vi');
    return lang;
  }

  /** Locale cho Intl.NumberFormat và toLocaleDateString */
  function numberLocale() {
    return lang === 'en' ? 'en-US' : lang === 'ja' ? 'ja-JP' : 'vi-VN';
  }

  return {
    get lang() { return lang; },
    LANGS: LANGS,
    setLang: setLang, init: init, t: translate, pick: pick,
    translateTree: translateTree, numberLocale: numberLocale,
    DICT: DICT, TABLE: TABLE
  };
})();
