import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { DataState } from "../components/DataState";
import { orderService } from "../services/orderService";
import { statisticsService } from "../services/statisticsService";
import type { BusinessSummary } from "../types/models";
import { daysAgoIsoDate, todayIsoDate } from "../utils/date";
import { formatMoney, formatNumber } from "../utils/format";

export function DashboardPage() {
  const [fromDate, setFromDate] = useState(daysAgoIsoDate(29));
  const [toDate, setToDate] = useState(todayIsoDate());
  const [summary, setSummary] = useState<BusinessSummary | null>(null);
  const [topProducts, setTopProducts] = useState<Array<{ name: string; revenue: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [business, orders] = await Promise.all([
        statisticsService.businessSummary(fromDate, toDate),
        orderService.list({ page: 0, size: 200, saleDateFrom: fromDate, saleDateTo: toDate }),
      ]);
      setSummary(business);
      const totals = new Map<string, number>();
      for (const order of orders.items.filter((item) => item.status !== "CANCELLED")) {
        for (const item of order.items) {
          const name = `${item.productName ?? item.productId} - ${item.variantName}`;
          totals.set(name, (totals.get(name) ?? 0) + (item.lineTotal ?? 0));
        }
      }
      setTopProducts([...totals.entries()].map(([name, revenue]) => ({ name, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 5));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const maxDailyRevenue = Math.max(...(summary?.dailyStatistics.map((item) => item.revenue) ?? [1]), 1);
  const maxCategoryRevenue = Math.max(...(summary?.categoryRevenues.map((item) => item.revenue) ?? [1]), 1);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Doanh thu, vốn nhập, lợi nhuận và trạng thái đơn hàng.</p>
        </div>
        <div className="toolbar">
          <label className="field">
            <span>Từ ngày</span>
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          </label>
          <label className="field">
            <span>Đến ngày</span>
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
          </label>
          <button className="primary" onClick={() => void load()}><RefreshCw size={16} /> Tải</button>
        </div>
      </div>

      <DataState loading={loading} error={error} empty={!summary}>
        {summary && (
          <div className="grid">
            <div className="grid three">
              <div className="metric"><span>Doanh thu</span><strong>{formatMoney(summary.totalRevenue)}</strong></div>
              <div className="metric"><span>Vốn nhập</span><strong>{formatMoney(summary.totalCost)}</strong></div>
              <div className="metric"><span>Lợi nhuận</span><strong>{formatMoney(summary.totalProfit)}</strong></div>
              <div className="metric"><span>Đơn hợp lệ</span><strong>{formatNumber(summary.totalOrders)}</strong></div>
              <div className="metric"><span>Chờ thanh toán</span><strong>{formatNumber(summary.paymentPendingOrders)}</strong></div>
              <div className="metric"><span>Chờ giao</span><strong>{formatNumber(summary.pendingShippingOrders)}</strong></div>
            </div>

            <div className="grid two">
              <section className="section">
                <h2>Doanh thu theo ngày</h2>
                <div className="bar-list">
                  {summary.dailyStatistics.map((item) => (
                    <div className="bar-row" key={item.date}>
                      <span>{item.date}</span>
                      <div className="bar"><span style={{ width: `${Math.max(4, item.revenue / maxDailyRevenue * 100)}%` }} /></div>
                      <strong>{formatMoney(item.revenue)}</strong>
                    </div>
                  ))}
                </div>
              </section>
              <section className="section">
                <h2>Doanh thu theo danh mục</h2>
                <div className="bar-list">
                  {summary.categoryRevenues.map((item) => (
                    <div className="bar-row" key={item.categoryName}>
                      <span>{item.categoryName}</span>
                      <div className="bar"><span style={{ width: `${Math.max(4, item.revenue / maxCategoryRevenue * 100)}%` }} /></div>
                      <strong>{formatMoney(item.revenue)}</strong>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="section">
              <h2>Top sản phẩm</h2>
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Sản phẩm</th><th>Doanh thu</th></tr></thead>
                  <tbody>
                    {topProducts.map((item) => (
                      <tr key={item.name}><td>{item.name}</td><td>{formatMoney(item.revenue)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </DataState>
    </>
  );
}
