/* ===========================================================
   i18n.js — Song ngữ Việt / Anh.

   CÁCH LÀM: tiếng Việt là ngôn ngữ gốc viết thẳng trong mã nguồn.
   Khi người dùng chọn tiếng Anh, một MutationObserver sẽ dịch các
   nút DOM ngay khi chúng được thêm vào trang.

   Vì sao chọn cách này: các màn hình vẽ bất đồng bộ (chờ đọc CSDL
   xong mới thêm nút), nên gọi dịch một lần sau khi vẽ sẽ hụt. Quan
   sát DOM thì bắt được hết, mà không phải sửa xuyên 5 tệp màn hình.

   Chuỗi nào chưa có trong từ điển sẽ giữ nguyên tiếng Việt — hỏng
   nhẹ chứ không vỡ giao diện.
   =========================================================== */

App.i18n = (function () {
  'use strict';

  var LS_KEY = 'qlct:lang';
  var lang = 'vi';
  var observer = null;

  /* ---------------------------------------------------------
     Từ điển: khớp nguyên chuỗi
     --------------------------------------------------------- */
  var DICT = {
    /* --- Điều hướng & tiêu đề --- */
    'Tổng quan': 'Overview',
    'Chi tiêu': 'Expenses',
    'Công việc': 'Tasks',
    'Thống kê': 'Statistics',
    'Cài đặt': 'Settings',
    'Ngày': 'Day',
    'Tuần': 'Week',
    'Tháng': 'Month',
    'Menu chính': 'Main menu',
    'Chọn kỳ xem': 'Select period',
    'Kỳ trước': 'Previous period',
    'Kỳ sau': 'Next period',
    'Đang tải…': 'Loading…',
    'Đã về kỳ hiện tại': 'Back to current period',

    /* --- Chung --- */
    'Hủy': 'Cancel',
    'Huỷ': 'Cancel',
    'Lưu': 'Save',
    'Lưu thay đổi': 'Save changes',
    'Xong': 'Done',
    'Đóng': 'Close',
    'Xóa': 'Delete',
    'Xoá': 'Delete',
    'Đồng ý': 'OK',
    'Đã hiểu': 'Got it',
    'Xác nhận': 'Confirm',
    'Tiếp tục': 'Continue',
    'Áp dụng': 'Apply',
    'Để sau': 'Later',
    'Thôi': 'No thanks',
    'Xem lại': 'Review',
    'Xem tất cả': 'See all',
    'Chỉnh sửa': 'Edit',
    'Quản lý': 'Manage',
    'Chưa có dữ liệu': 'No data yet',
    'Không đổi': 'No change',
    'Chưa bao giờ': 'Never',
    'Hôm nay': 'Today',
    'Hôm qua': 'Yesterday',
    'Hôm kia': '2 days ago',
    'Ngày mai': 'Tomorrow',
    'Cuối tuần': 'End of week',
    'Cuối tháng': 'End of month',
    'không giới hạn': 'no limit',
    'Tìm kiếm': 'Search',

    /* --- Tổng quan --- */
    'Hạn mức chi tiêu': 'Spending limits',
    'Tuần này': 'This week',
    'Tháng này': 'This month',
    'Thu vào': 'Income',
    'Chi ra': 'Spent',
    'Còn lại': 'Left',
    'Tỉ lệ để dành': 'Savings rate',
    'Nên tiêu mỗi ngày': 'Daily allowance',
    'Chưa đặt hạn mức': 'No limit set',
    'Đặt hạn mức →': 'Set a limit →',
    'Đặt hạn mức để app cảnh báo khi bạn tiêu quá tay.': 'Set limits so the app can warn you before you overspend.',
    'Đã vượt hạn mức!': 'Limit exceeded!',
    'Sắp chạm hạn mức': 'Approaching your limit',
    'Nhập nhanh': 'Quick add',
    'Chạm để ghi ngay khoản này cho hôm nay. Danh sách tự cập nhật theo thói quen của bạn.':
      'Tap to log this for today. The list updates itself based on your habits.',
    'Việc cần làm': 'To do',
    'Mục tiêu tiết kiệm': 'Savings goals',
    'Giao dịch gần đây': 'Recent transactions',
    'Chưa có giao dịch nào': 'No transactions yet',
    'Nhấn nút + màu xanh để ghi khoản đầu tiên.': 'Tap the blue + button to log your first one.',
    'Nên sao lưu dữ liệu': 'Time to back up',
    'Sao lưu ngay': 'Back up now',

    /* --- Giao dịch --- */
    'Thêm giao dịch': 'Add transaction',
    'Sửa giao dịch': 'Edit transaction',
    'Thêm giao dịch mới': 'Add a new transaction',
    '− Khoản chi': '− Expense',
    '+ Khoản thu': '+ Income',
    'Khoản chi': 'Expense',
    'Khoản thu': 'Income',
    'Số tiền': 'Amount',
    'Hạng mục': 'Category',
    'Ghi chú (không bắt buộc)': 'Note (optional)',
    'VD: mua rau ở siêu thị': 'e.g. groceries at the supermarket',
    '📷  Đính kèm ảnh hóa đơn': '📷  Attach receipt photo',
    'Gỡ ảnh': 'Remove',
    'Ảnh hóa đơn': 'Receipt photo',
    'Ảnh hóa đơn đã đính kèm': 'Attached receipt photo',
    '🗑  Xóa giao dịch này': '🗑  Delete this transaction',
    'Xóa giao dịch?': 'Delete transaction?',
    'Giao dịch này sẽ bị xóa vĩnh viễn khỏi máy.': 'This transaction will be permanently deleted from your device.',
    'Đã xóa giao dịch': 'Transaction deleted',
    'Đã cập nhật': 'Updated',
    'Hãy nhập số tiền lớn hơn 0': 'Please enter an amount greater than 0',
    'Hãy chọn một hạng mục': 'Please pick a category',
    'Hãy chọn ngày': 'Please pick a date',
    'Hãy nhập số tiền': 'Please enter an amount',
    'Lưu thất bại': 'Could not save',
    '⚠️ Vượt hạn mức': '⚠️ Over the limit',
    'Vẫn lưu': 'Save anyway',
    'Vẫn ghi': 'Log it anyway',
    'Tất cả': 'All',
    'Chi': 'Out',
    'Thu': 'In',
    '⚙️ Bộ lọc': '⚙️ Filters',
    'Lọc giao dịch': 'Filter transactions',
    'Xóa lọc': 'Clear filters',
    'Tìm trong ghi chú và tên hạng mục': 'Search notes and category names',
    '— Tất cả hạng mục —': '— All categories —',
    'Không có kết quả phù hợp': 'No matching results',
    'Thử bỏ bớt bộ lọc.': 'Try removing some filters.',
    'Chưa có hạng mục. Thêm ở tab Cài đặt.': 'No categories yet. Add some under Settings.',

    /* --- Công việc --- */
    'Thêm công việc': 'Add task',
    'Sửa công việc': 'Edit task',
    'Thêm công việc mới': 'Add a new task',
    'Thêm công việc đầu tiên': 'Add your first task',
    'Tên công việc': 'Task name',
    'VD: Đóng tiền điện': 'e.g. Pay the electricity bill',
    'Hạn hoàn thành': 'Due date',
    'Mức ưu tiên': 'Priority',
    'Lặp lại': 'Repeat',
    'Không lặp': 'No repeat',
    'Hằng ngày': 'Daily',
    'Hằng tuần': 'Weekly',
    'Hằng tháng': 'Monthly',
    'hằng ngày': 'daily',
    'hằng tuần': 'weekly',
    'hằng tháng': 'monthly',
    'Thường': 'Normal',
    'Quan trọng': 'Important',
    'Gấp': 'Urgent',
    'Chi tiết thêm': 'More details',
    'Khi bạn tích hoàn thành, app sẽ tự tạo lần kế tiếp.': 'When you tick it off, the app creates the next occurrence.',
    '🗑  Xóa công việc': '🗑  Delete task',
    'Xóa công việc?': 'Delete task?',
    'Đã xóa': 'Deleted',
    'Đã thêm công việc': 'Task added',
    'Hãy nhập tên công việc': 'Please enter a task name',
    'Đánh dấu hoàn thành': 'Mark as done',
    'Bỏ đánh dấu hoàn thành': 'Mark as not done',
    'Đang mở': 'Open',
    'Quá hạn': 'Overdue',
    'Đã xong': 'Done',
    '⏰ Quá hạn': '⏰ Overdue',
    '📌 Hôm nay': '📌 Today',
    '🗓 Còn lại trong tuần': '🗓 Rest of this week',
    '📆 Còn lại trong tháng': '📆 Rest of this month',
    '🔮 Sau này': '🔮 Later',
    '📥 Không đặt hạn': '📥 No due date',
    'Chưa có công việc nào': 'No tasks yet',
    'Nhấn nút ＋ ở góc trên để thêm việc cần làm.': 'Tap ＋ at the top to add something to do.',
    'Xong hết việc rồi!': 'All caught up!',
    'Không còn công việc nào đang mở.': 'Nothing left on your plate.',
    '🗑 Xóa hết việc đã xong': '🗑 Clear all completed tasks',
    'Thao tác này không hoàn tác được.': 'This cannot be undone.',
    'Xóa hết': 'Delete all',
    'Đã dọn sạch': 'All cleared',

    /* --- Thống kê --- */
    'Thu nhập': 'Income',
    'Theo hạng mục': 'By category',
    'Tổng chi': 'Total spent',
    'Tổng thu': 'Total income',
    'Trung bình/ngày': 'Daily average',
    'Số giao dịch': 'Transactions',
    'Số ngày': 'Days',
    'Theo ngày trong tuần': 'By day of week',
    'Theo ngày trong tháng': 'By day of month',
    'Theo tháng': 'By month',
    '14 ngày gần đây': 'Last 14 days',
    'Xu hướng 6 tháng': '6-month trend',
    'Chạm vào cột để xem số tiền': 'Tap a bar to see the amount',
    'Chạm vào lát màu để xem số chi tiết.': 'Tap a slice to see exact figures.',
    '┄ hạn mức ngày': '┄ daily limit',
    'Hạn mức theo hạng mục (tháng)': 'Per-category monthly limits',
    'Chưa có dữ liệu trong kỳ này': 'No data for this period',
    'Ghi vài giao dịch rồi quay lại xem biểu đồ nhé.': 'Log a few transactions and the charts will fill in.',

    /* --- Cài đặt --- */
    'Tiền bạc': 'Money',
    'Giao diện & cảnh báo': 'Appearance & alerts',
    'Bảo mật': 'Security',
    'Dữ liệu của bạn': 'Your data',
    'Về ứng dụng': 'About',
    'Hạn mức ngày / tuần / tháng': 'Daily / weekly / monthly limits',
    'Hạn mức theo hạng mục': 'Per-category limits',
    'Đơn vị tiền tệ': 'Currency',
    'Hạng mục thu / chi': 'Income & expense categories',
    'Khoản thu/chi định kỳ': 'Recurring transactions',
    'Tiền nhà, internet, lương…': 'Rent, internet, salary…',
    'Đặt đích và theo dõi tiến độ': 'Set a target and track progress',
    'Chế độ màu': 'Colour mode',
    'Theo hệ thống': 'Match system',
    'Luôn sáng': 'Always light',
    'Luôn tối': 'Always dark',
    'Ngôn ngữ': 'Language',
    'Tuần bắt đầu từ': 'Week starts on',
    'Thứ hai': 'Monday',
    'Chủ nhật': 'Sunday',
    'Cảnh báo vàng khi đạt': 'Amber warning at',
    'Thanh hạn mức chuyển vàng khi chi tiêu đạt mức này.': 'The limit bar turns amber once spending reaches this level.',
    'Hỏi lại khi vượt hạn mức': 'Ask before exceeding a limit',
    'Hiện hộp xác nhận trước khi lưu khoản làm vượt mức.': 'Show a confirmation before saving a transaction that goes over.',
    'Thông báo hệ thống': 'System notifications',
    'Nhắc bạn khi mở app nếu kỳ trước đã vượt hạn mức.': 'Remind you on launch if you went over during the last period.',
    'Đã bật thông báo': 'Notifications enabled',
    'Bạn đã từ chối quyền thông báo': 'You declined the notification permission',
    'Trình duyệt này không hỗ trợ thông báo': 'This browser does not support notifications',

    'Khoá ứng dụng': 'App lock',
    'Đặt mã PIN để người khác không xem được': 'Set a PIN so others cannot look through your finances',
    'Khoá ứng dụng bằng mã PIN': 'Lock the app with a PIN',
    'Hỏi mã PIN mỗi khi mở app': 'Ask for a PIN every time the app opens',
    'Đang bật': 'On',
    'Đặt mã PIN': 'Set a PIN',
    'Nhập mã PIN': 'Enter your PIN',
    'Nhập mã PIN mới': 'Enter a new PIN',
    'Nhập lại mã PIN': 'Re-enter the PIN',
    'Gõ lại đúng mã vừa rồi để xác nhận.': 'Type the same code again to confirm.',
    'Bật khoá': 'Turn on lock',
    '🔑  Đổi mã PIN': '🔑  Change PIN',
    'Tự khoá lại khi rời app': 'Auto-lock when you leave',
    'Ngay lập tức': 'Immediately',
    'Sau 1 phút': 'After 1 minute',
    'Sau 5 phút': 'After 5 minutes',
    'Sau 15 phút': 'After 15 minutes',
    'Sau 1 giờ': 'After 1 hour',
    'Mở khoá bằng vân tay / khuôn mặt': 'Unlock with fingerprint / face',
    'Mở khoá bằng vân tay': 'Unlock with fingerprint',
    'Vẫn giữ mã PIN làm phương án dự phòng': 'Your PIN still works as a fallback',
    'Đã bật mở khoá bằng vân tay': 'Biometric unlock enabled',
    'Đã bật khoá ứng dụng': 'App lock enabled',
    'Đã tắt khoá': 'App lock turned off',
    'Đã tắt': 'Turned off',
    'Tắt khoá ứng dụng?': 'Turn off the app lock?',
    'Ai cầm máy bạn cũng mở xem được toàn bộ chi tiêu.': 'Anyone holding your phone will be able to see all your spending.',
    'Tắt khoá': 'Turn off',
    'Quên mã PIN?': 'Forgot your PIN?',
    'Quên mã PIN': 'Forgot PIN',
    'Quên PIN là mất dữ liệu': 'Forget the PIN and the data is gone',
    'Hai lần nhập không khớp, thử lại': 'The two entries did not match, try again',
    'Không bật được khoá': 'Could not enable the lock',
    'Không đăng ký được': 'Registration failed',
    'Bạn đã huỷ hoặc thiết bị từ chối.': 'You cancelled, or the device declined.',
    'Đang chờ xác thực…': 'Waiting for authentication…',
    'Không nhận diện được, hãy nhập mã PIN.': 'Not recognised — please enter your PIN.',
    'Xoá một chữ số': 'Delete one digit',
    'Màn hình khoá': 'Lock screen',
    'Đây là lớp che, không phải mã hoá': 'This is a screen, not encryption',

    'Xuất file sao lưu (JSON)': 'Export backup (JSON)',
    'Đủ mọi thứ, kể cả ảnh hóa đơn': 'Everything, receipt photos included',
    'Xuất giao dịch ra CSV': 'Export transactions as CSV',
    'Mở được bằng Excel': 'Opens in Excel',
    'Nhập lại từ file sao lưu': 'Restore from a backup file',
    'Ghi đè toàn bộ dữ liệu hiện tại': 'Overwrites everything currently stored',
    'Xóa toàn bộ dữ liệu': 'Erase all data',
    'Không khôi phục được': 'Cannot be undone',
    'Nhắc sao lưu': 'Backup reminder',
    'Không nhắc': 'Never',
    'Mỗi tuần': 'Weekly',
    'Mỗi 2 tuần': 'Every 2 weeks',
    'Mỗi tháng': 'Monthly',
    'App sẽ nhắc ở màn Tổng quan khi đã lâu chưa sao lưu và có giao dịch mới.':
      'The app will remind you on the Overview screen when a backup is overdue.',
    'Sao lưu gần nhất': 'Last backup',
    'Dữ liệu chỉ nằm trong máy bạn': 'Your data never leaves this device',
    'App không gửi gì lên mạng. Nếu bạn gỡ app hoặc xóa dữ liệu trình duyệt, dữ liệu sẽ mất — hãy xuất file sao lưu định kỳ.':
      'The app sends nothing over the network. Uninstalling it or clearing your browser data will erase everything — export a backup regularly.',
    'Đang dùng bộ nhớ dự phòng (localStorage) — dung lượng hạn chế, nên hạn chế đính kèm ảnh và nhớ xuất sao lưu thường xuyên.':
      'Running on fallback storage (localStorage) — space is limited, so go easy on photos and back up often.',
    'Đọc chính sách bảo mật →': 'Read the privacy policy →',
    'Khôi phục dữ liệu?': 'Restore data?',
    'Ghi đè và khôi phục': 'Overwrite and restore',
    'Không nhập được': 'Import failed',
    'Xóa toàn bộ dữ liệu?': 'Erase all data?',
    'Tôi hiểu, xóa hết': 'I understand, erase it',
    'Chắc chắn chưa?': 'Are you sure?',
    'Đây là bước xác nhận cuối cùng. Sau bước này không khôi phục lại được.':
      'This is the final confirmation. There is no way back after this.',
    'Đã xóa toàn bộ dữ liệu': 'All data erased',

    'Phiên bản': 'Version',
    'Nơi lưu dữ liệu': 'Storage',
    'Chạy offline': 'Offline mode',
    'Đã bật ✓': 'Enabled ✓',
    'Chưa bật': 'Not enabled',
    'IndexedDB (tốt)': 'IndexedDB (good)',
    'localStorage (dự phòng)': 'localStorage (fallback)',
    '📲  Cách cài vào màn hình chính': '📲  How to install on your home screen',
    'Cài vào màn hình chính': 'Install on home screen',

    /* --- Hạng mục --- */
    'Hạng mục CHI': 'EXPENSE categories',
    'Hạng mục THU': 'INCOME categories',
    'Thêm hạng mục': 'Add category',
    'Sửa hạng mục': 'Edit category',
    'Thêm hạng mục chi': 'Add expense category',
    'Thêm hạng mục thu': 'Add income category',
    'Tên hạng mục': 'Category name',
    'Biểu tượng': 'Icon',
    'Màu': 'Colour',
    'VD: Cà phê': 'e.g. Coffee',
    'Chạm để sửa tên, biểu tượng, màu': 'Tap to change name, icon or colour',
    '🗑  Xóa hạng mục': '🗑  Delete category',
    'Xóa hạng mục?': 'Delete category?',
    'Ẩn hạng mục?': 'Hide category?',
    'Ẩn đi': 'Hide it',
    'Đã ẩn hạng mục': 'Category hidden',
    'Đã xóa hạng mục': 'Category deleted',
    'Đã lưu hạng mục': 'Category saved',
    'Hãy nhập tên hạng mục': 'Please enter a category name',
    'Hạng mục này chưa có giao dịch nào, sẽ được xóa hẳn.': 'This category has no transactions and will be removed entirely.',

    'Đi chợ / Ăn uống': 'Groceries / Food',
    'Tiền nhà': 'Rent',
    'Xăng xe / Đi lại': 'Fuel / Transport',
    'Điện nước ga': 'Utilities',
    'Điện thoại / Net': 'Phone / Internet',
    'Y tế': 'Health',
    'Mua sắm': 'Shopping',
    'Giải trí': 'Entertainment',
    'Học tập': 'Education',
    'Bảo hiểm / Thuế': 'Insurance / Tax',
    'Gửi về nhà': 'Money home',
    'Khác': 'Other',
    'Lương': 'Salary',
    'Làm thêm': 'Side work',
    'Thưởng': 'Bonus',
    'Thu khác': 'Other income',
    'Không rõ': 'Unknown',

    /* --- Phương thức thanh toán --- */
    'Phương thức thanh toán': 'Payment methods',
    'Thanh toán bằng': 'Paid with',
    'Theo phương thức thanh toán': 'By payment method',
    'Thêm phương thức thanh toán': 'Add a payment method',
    'Thêm phương thức': 'Add method',
    'Sửa phương thức': 'Edit method',
    'Tên phương thức': 'Method name',
    'Tên tiếng Nhật (không bắt buộc)': 'Japanese name (optional)',
    'Ghi để dễ đối chiếu với hóa đơn và app ngân hàng.': 'Handy for matching receipts and banking apps.',
    '🗑  Xóa phương thức': '🗑  Delete method',
    'Xóa phương thức?': 'Delete method?',
    'Ẩn phương thức?': 'Hide method?',
    'Đã xóa phương thức': 'Method deleted',
    'Đã ẩn phương thức': 'Method hidden',
    'Đã lưu phương thức': 'Method saved',
    'Hãy nhập tên phương thức': 'Please enter a method name',
    'Không ghi phương thức': 'No method recorded',
    'Phương thức này chưa có giao dịch nào, sẽ được xóa hẳn.':
      'This method has no transactions and will be removed entirely.',
    'Danh sách mặc định theo các hình thức đang phổ biến ở Nhật. Bạn sửa hoặc thêm tùy ý.':
      'The defaults reflect what is common in Japan. Edit or add as you like.',
    '— Tất cả phương thức —': '— All payment methods —',
    'Tiền mặt': 'Cash',
    'Thẻ tín dụng': 'Credit card',
    'Thẻ ghi nợ': 'Debit card',
    'Chuyển khoản': 'Bank transfer',
    'Trừ tự động': 'Direct debit',
    'Trả tại konbini': 'Convenience store',
    'VD: PayPay': 'e.g. PayPay',
    'VD: ペイペイ': 'e.g. ペイペイ',

    /* --- Hạn mức --- */
    'Đặt hạn mức chi tiêu': 'Set spending limits',
    'Hạn mức mỗi NGÀY': 'DAILY limit',
    'Hạn mức mỗi TUẦN': 'WEEKLY limit',
    'Hạn mức mỗi THÁNG': 'MONTHLY limit',
    'Tổng chi trong 1 ngày': 'Total spend in one day',
    'Tính theo tháng dương lịch': 'Based on the calendar month',
    '🧮  Tính ngày & tuần từ hạn mức tháng': '🧮  Derive daily & weekly from the monthly limit',
    'Hãy nhập hạn mức tháng trước': 'Enter the monthly limit first',
    'Đã điền gợi ý, bạn có thể sửa lại': 'Suggestions filled in — feel free to adjust',
    'Đã lưu hạn mức': 'Limits saved',
    'Đã lưu': 'Saved',
    'Đặt trần chi tiêu hằng tháng cho từng hạng mục. Để trống nghĩa là không giới hạn.':
      'Set a monthly ceiling per category. Leave blank for no limit.',
    'Chưa đặt hạn mức riêng nào': 'No per-category limits set',
    'Chưa đặt — chạm để thiết lập': 'Not set — tap to configure',

    /* --- Định kỳ --- */
    'Khoản định kỳ đến hạn': 'Recurring items due',
    'Thêm khoản định kỳ': 'Add a recurring item',
    'Sửa khoản định kỳ': 'Edit recurring item',
    '＋  Thêm khoản định kỳ': '＋  Add a recurring item',
    'Xóa khoản định kỳ?': 'Delete recurring item?',
    '🗑  Xóa khoản định kỳ': '🗑  Delete recurring item',
    'Chưa có khoản định kỳ': 'No recurring items yet',
    'Bỏ chọn những khoản bạn chưa thực sự chi/thu.': 'Untick anything you have not actually paid or received.',
    'Ghi vào sổ': 'Add to the ledger',
    'Đã bỏ qua': 'Skipped',
    'Ghi thất bại': 'Could not save',
    'Loại': 'Type',
    'Tên gọi': 'Label',
    'VD: Tiền nhà tháng': 'e.g. Monthly rent',
    'Tần suất': 'Frequency',
    'Vào thứ': 'On',
    'Vào ngày trong tháng': 'Day of the month',
    'Nhập 31 nếu muốn luôn rơi vào ngày cuối tháng.': 'Enter 31 to always land on the last day of the month.',
    'Tắt để tạm dừng mà không xóa': 'Switch off to pause without deleting',
    'Đã lưu khoản định kỳ': 'Recurring item saved',
    'Hãy chọn hạng mục': 'Please pick a category',
    'đang tắt': 'paused',

    /* --- Mục tiêu --- */
    'Thêm mục tiêu': 'Add a goal',
    'Sửa mục tiêu': 'Edit goal',
    '＋  Thêm mục tiêu': '＋  Add a goal',
    'Xóa mục tiêu?': 'Delete goal?',
    '🗑  Xóa mục tiêu': '🗑  Delete goal',
    'Chưa có mục tiêu nào': 'No goals yet',
    'Tên mục tiêu': 'Goal name',
    'VD: Mua xe máy': 'e.g. Buy a motorbike',
    'Đã để dành được': 'Saved so far',
    'Hạn hoàn thành (không bắt buộc)': 'Target date (optional)',
    'Nạp vào mục tiêu': 'Add to goal',
    '＋ Nạp': '＋ Add',
    'Nạp': 'Add',
    'Nhập số âm nếu bạn muốn rút bớt ra.': 'Enter a negative number to take money back out.',
    'Đã lưu mục tiêu': 'Goal saved',
    'Số tiền cần có phải lớn hơn 0': 'The target must be greater than 0',
    'Hãy nhập tên mục tiêu': 'Please enter a goal name',
    '🎉 Đã hoàn thành!': '🎉 Goal reached!',
    'đã quá hạn': 'past the target date',
    'Sửa mục tiêu': 'Edit goal',

    /* --- Cập nhật --- */
    'Có bản cập nhật': 'Update available',
    'Phiên bản mới của app đã tải xong. Tải lại để dùng bản mới?':
      'A new version has finished downloading. Reload to use it?',
    'Tải lại': 'Reload',
    'Vượt hạn mức chi tiêu': 'Spending limit exceeded'
  };

  /* ---------------------------------------------------------
     Quy tắc cho chuỗi ghép động (có số, có tiền)
     $1, $2… là các nhóm bắt được trong biểu thức
     --------------------------------------------------------- */
  var PATTERNS = [
    [/^Còn lại (.+)$/, 'Left: $1'],
    [/^Còn (\d+) ngày$/, '$1 days left'],
    [/^Quá hạn (\d+) ngày$/, '$1 days overdue'],
    [/^⚠️ Vượt (.+)$/, '⚠️ Over by $1'],
    [/^⚠️ Sắp hết, còn (.+)$/, '⚠️ Almost gone — $1 left'],
    [/^Vượt (.+)$/, 'Over by $1'],
    [/^Số dư tháng (\d+)$/, 'Balance for month $1'],
    [/^còn (\d+) ngày$/, '$1 days to go'],
    [/^Tháng (\d+)\/(\d+)$/, '$1/$2'],
    [/^Năm (\d+)$/, 'Year $1'],
    [/^(\d+) giao dịch$/, '$1 transactions'],
    [/^(\d+) giao dịch \(lọc từ (\d+)\)$/, '$1 of $2 transactions'],
    [/^Đã ghi (\d+) khoản định kỳ$/, 'Logged $1 recurring items'],
    [/^Có (\d+) khoản định kỳ đến hạn$/, '$1 recurring items are due'],
    [/^Mỗi tháng vào ngày (\d+)$/, 'Monthly on day $1'],
    [/^Mỗi tuần vào (.+)$/, 'Weekly on $1'],
    [/^Trung bình (.+)\/tháng$/, 'Average $1/month'],
    [/^(\d+) hạng mục có hạn mức riêng$/, '$1 categories have their own limit'],
    [/^(\d+) hạng mục chi, (\d+) hạng mục thu$/, '$1 expense, $2 income categories'],
    [/^(\d+) phương thức đang dùng$/, '$1 methods in use'],
    [/^Có (\d+) giao dịch đang dùng phương thức này\. (.+)$/, '$1 transactions use this method. $2'],
    [/^Có (\d+) giao dịch đang dùng hạng mục này\. (.+)$/, '$1 transactions use this category. $2'],
    [/^Mã PIN không đúng \((\d+)\/(\d+)\)$/, 'Wrong PIN ($1/$2)'],
    [/^Sai quá nhiều lần\. Chờ (\d+) giây rồi thử lại\.$/, 'Too many attempts. Wait $1 seconds.'],
    [/^Từ (\d+) đến (\d+) chữ số\.$/, 'Between $1 and $2 digits.'],
    [/^Đã lưu (.+)$/, 'Saved $1'],
    [/^Đã ghi (.+)$/, 'Logged $1'],
    [/^Đã nạp (.+)$/, 'Added $1'],
    [/^Đã rút (.+)$/, 'Withdrew $1'],
    [/^Đã tải về (.+)$/, 'Downloaded $1'],
    [/^Đã tải về (\d+) dòng$/, 'Downloaded $1 rows'],
    [/^Đã khôi phục (\d+) giao dịch$/, 'Restored $1 transactions'],
    [/^Đã đính kèm ảnh \((.+)\)$/, 'Photo attached ($1)'],
    [/^Đã đổi sang (.+)$/, 'Switched to $1'],
    [/^Đã quy đổi sang (.+)$/, 'Converted to $1'],
    [/^Khác \((\d+) mục\)$/, 'Other ($1 items)'],
    [/^(\d+) ngày trước$/, '$1 days ago'],
    [/^Hiện (\d+) việc đã xong$/, 'Show $1 completed tasks'],
    [/^Ẩn (\d+) việc đã xong$/, 'Hide $1 completed tasks'],
    [/^Xóa (\d+) việc đã xong\?$/, 'Delete $1 completed tasks?'],
    [/^Đã tạo lần kế tiếp: (.+)$/, 'Next occurrence created: $1'],
    [/^Sẽ nhắc lại sau (\d+) ngày$/, 'Will remind you again in $1 days'],
    [/^Tiến độ (\d+)%$/, 'Progress $1%'],
    [/^Màu (\d+)$/, 'Colour $1'],
    [/^Số tiền \((\w+)\)$/, 'Amount ($1)'],
    [/^Số tiền cần có \((\w+)\)$/, 'Target amount ($1)'],
    [/^Nạp thêm \((\w+)\)$/, 'Add more ($1)'],
    [/^Hạn mức mỗi NGÀY \((\w+)\)$/, 'DAILY limit ($1)'],
    [/^Hạn mức mỗi TUẦN \((\w+)\)$/, 'WEEKLY limit ($1)'],
    [/^Hạn mức mỗi THÁNG \((\w+)\)$/, 'MONTHLY limit ($1)'],
    [/^Tính theo tuần bắt đầu từ (.+)$/, 'Based on weeks starting $1'],
    [/^(\d+) tệp$/, '$1 files']
  ];

  /* ---------------------------------------------------------
     Dịch một chuỗi
     --------------------------------------------------------- */
  function translate(text) {
    if (lang === 'vi') return text;
    var trimmed = text.trim();
    if (!trimmed) return text;

    var hit = DICT[trimmed];
    if (hit === undefined) {
      for (var i = 0; i < PATTERNS.length; i++) {
        var m = trimmed.match(PATTERNS[i][0]);
        if (m) {
          hit = PATTERNS[i][1].replace(/\$(\d)/g, function (_, n) { return m[+n] || ''; });
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
  function pick(vi, en) { return lang === 'en' ? en : vi; }

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
  function setLang(next) {
    lang = (next === 'en') ? 'en' : 'vi';
    try { localStorage.setItem(LS_KEY, lang); } catch (e) { /* bị chặn thì thôi */ }
    document.documentElement.lang = lang;
    document.title = lang === 'en' ? 'Expense Manager' : 'Quản lý Chi tiêu';
    if (lang === 'en') {
      startObserver();
      // Thanh tab và thanh chọn kỳ là HTML tĩnh, không bao giờ được thêm lại
      // nên bộ quan sát không thấy. Dịch cả trang một lần ngay lúc này.
      if (document.body) translateTree(document.body);
    } else {
      stopObserver();
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
  function numberLocale() { return lang === 'en' ? 'en-US' : 'vi-VN'; }

  return {
    get lang() { return lang; },
    setLang: setLang, init: init, t: translate, pick: pick,
    translateTree: translateTree, numberLocale: numberLocale,
    DICT: DICT, PATTERNS: PATTERNS
  };
})();
