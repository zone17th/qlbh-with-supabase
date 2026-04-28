# TODO Unknowns

Các mục dưới đây được ghi là `Chưa xác định từ source` hoặc là gap trong `SOURCE_SYSTEM_SPEC.md`. Rebuild không tự thêm nghiệp vụ mới cho các mục này.

1. Real authentication/authorization: source chỉ mock admin và `permitAll`. Chưa có user/role/permission thật.
2. Company/branch/data scope: không có field hoặc policy nghiệp vụ trong source.
3. Customer entity độc lập: khách hàng chỉ là field trong `sales_orders`.
4. Báo giá: không thấy entity/API/module.
5. Hóa đơn bán hàng: không thấy entity/API; `invoiceFile` chỉ là string trên nhập kho.
6. Payment gateway/payment transaction: không có model riêng; POS payment là transition `PAYMENT_PENDING -> COMPLETED`.
7. External API/email/SMS/file upload: không có client tích hợp.
8. Scheduler/background job/cache/queue: không thấy trong source.
9. Report export CSV/Excel/PDF: không thấy endpoint.
10. Phone/date range validation: source không có regex phone hoặc check `fromDate <= toDate`.
11. Product variant duplicate validation: source không enforce unique.
12. Manual inventory import không verify variant thuộc product trong source; rebuild giữ behavior này.
13. Manual inventory export trong source không verify lot thuộc đúng product/variant; rebuild chỉ kiểm tra lot sellable giống gap đã ghi.
14. Order-generated `EXPORT/ORDER` không set `importTransactionId`; lot usage nằm ở `sales_order_items.importTransactionId`.
15. `restoreStockFromCancelledOrder` có thể không giữ được import lot reference do order export không set `importTransactionId`.
16. `actualProfit` khi shipping không subtract `extraCostTotal`, theo source formula.
17. `OrderServiceImpl.update` source có gap nghiêm trọng. Rebuild dùng mapper đầy đủ để endpoint chạy được nhưng vẫn ghi nhận đây là khác biệt cần xác nhận nếu muốn mô phỏng lỗi cũ chính xác.
18. Không có test suite gốc; cần bổ sung automated tests nếu nâng cấp production.
