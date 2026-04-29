import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  DollarSign,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Truck,
  XCircle,
  Clock,
  CreditCard,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  TableProperties,
} from "lucide-react";
import { DatePicker } from "../components/DatePicker";
import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
  Line,
  ComposedChart,
} from "recharts";
import { daysAgoIsoDate, todayIsoDate } from "../utils/date";
import { formatMoney, formatNumber } from "../utils/format";
import { useDashboardSummary } from "../hooks/useDashboardSummary";

const CHART_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
];

function shortMoney(value: number): string {
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

export function DashboardPage() {
  const [fromDate, setFromDate] = useState(daysAgoIsoDate(29));
  const [toDate, setToDate] = useState(todayIsoDate());
  const [preset, setPreset] = useState("30");
  const dashboardQuery = useDashboardSummary(fromDate, toDate);
  const summary = dashboardQuery.data?.summary;
  const topProducts = dashboardQuery.data?.topProducts ?? [];

  function onPresetChange(value: string) {
    setPreset(value);
    if (value === "custom") return;
    const days = Number(value);
    setFromDate(daysAgoIsoDate(Math.max(days - 1, 0)));
    setToDate(todayIsoDate());
  }

  /* derived data for charts */
  const dailyChartData = (summary?.dailyStatistics ?? []).map((d) => ({
    ...d,
    shortDate: d.date.slice(5), // "MM-DD"
  }));

  const categoryChartData = (summary?.categoryRevenues ?? []).map((c, i) => ({
    name: c.categoryName,
    value: c.revenue,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const statusData = summary
    ? [
        { name: "Đã giao", value: summary.shippedOrders, color: "#10b981" },
        { name: "Chờ thanh toán", value: summary.paymentPendingOrders, color: "#f59e0b" },
        { name: "Chờ giao", value: summary.pendingShippingOrders, color: "#3b82f6" },
        { name: "Đã hủy", value: summary.cancelledOrders ?? 0, color: "#ef4444" },
      ]
    : [];

  const profitMargin =
    summary && summary.totalRevenue > 0
      ? ((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-6 animate-in">
      {/* ═══ Header Row ═══ */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 text-xs md:text-sm text-muted">
            Tổng quan kinh doanh — cập nhật theo thời gian thực
          </p>
        </div>

        {/* Date range controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="hidden sm:flex items-center justify-center text-disabled bg-white w-9 h-9 rounded-lg border border-divider shadow-sm">
              <CalendarDays size={16} />
            </span>
            <div className="flex bg-brand-100/40 p-1 rounded-lg flex-1 sm:flex-none">
              {["7", "30", "90"].map((val) => (
                <button
                  key={val}
                  onClick={() => onPresetChange(val)}
                  className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                    preset === val
                      ? "bg-white text-brand-600 shadow-sm"
                      : "text-muted hover:text-ink/80"
                  }`}
                >
                  {val}D
                </button>
              ))}
            </div>
            <button
              onClick={() => void dashboardQuery.refetch()}
              className="p-2 w-9 h-9 rounded-lg bg-white border border-divider text-muted hover:text-brand-600 hover:border-brand-300 transition-all flex sm:hidden items-center justify-center shadow-sm"
            >
              <RefreshCw size={16} className={dashboardQuery.isFetching ? "animate-spin" : ""} />
            </button>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:w-[130px]">
              <DatePicker
                value={fromDate}
                onChange={(val) => { setFromDate(val); setPreset("custom"); }}
              />
            </div>
            <span className="text-disabled text-xs font-medium">đến</span>
            <div className="flex-1 sm:w-[130px]">
              <DatePicker
                value={toDate}
                onChange={(val) => { setToDate(val); setPreset("custom"); }}
              />
            </div>
            <button
              onClick={() => void dashboardQuery.refetch()}
              className="hidden sm:flex p-2 w-9 h-9 rounded-lg bg-white border border-divider text-muted hover:text-brand-600 hover:border-brand-300 transition-all items-center justify-center shadow-sm"
            >
              <RefreshCw size={16} className={dashboardQuery.isFetching ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Error ═══ */}
      {dashboardQuery.isError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-5 py-3 rounded-xl text-sm">
          <XCircle size={18} />
          {dashboardQuery.error instanceof Error
            ? dashboardQuery.error.message
            : "Không tải được dashboard"}
        </div>
      )}

      {/* ═══ Loading skeleton ═══ */}
      {!summary && dashboardQuery.isLoading && <DashboardSkeleton />}

      {summary && (
        <>
          {/* ═══ KPI Cards ═══ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <KpiCard
              icon={<ShoppingCart size={20} />}
              iconClass="bg-brand-500/10 text-brand-600"
              borderClass="border-l-brand-500"
              label="Tổng đơn hàng"
              value={formatNumber(summary.totalOrders)}
              sub={`${summary.shippedOrders} đã giao · ${summary.cancelledOrders ?? 0} hủy`}
            />
            <KpiCard
              icon={<DollarSign size={20} />}
              iconClass="bg-violet-500/10 text-violet-600"
              borderClass="border-l-violet-500"
              label="Doanh thu"
              value={formatMoney(summary.totalRevenue)}
              sub="Đơn hoàn thành"
            />
            <KpiCard
              icon={<Package size={20} />}
              iconClass="bg-orange-500/10 text-orange-600"
              borderClass="border-l-orange-500"
              label="Vốn nhập"
              value={formatMoney(summary.totalCost)}
              sub="Tổng giá vốn"
            />
            <KpiCard
              icon={<TrendingUp size={20} />}
              iconClass="bg-emerald-500/10 text-emerald-600"
              borderClass="border-l-emerald-500"
              label="Lợi nhuận"
              value={formatMoney(summary.totalProfit)}
              badge={
                summary.totalProfit >= 0
                  ? { text: `${profitMargin}%`, positive: true }
                  : { text: `${profitMargin}%`, positive: false }
              }
              sub="Tỉ suất lợi nhuận"
            />
          </div>

          {/* ═══ Charts Row 1 : Revenue area + Order status donut ═══ */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* Revenue / Profit area chart */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-divider shadow-soft-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Activity size={18} className="text-brand-500" />
                  <h3 className="font-bold text-ink">Doanh thu & Lợi nhuận</h3>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                    Doanh thu
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Lợi nhuận
                  </span>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyChartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="shortDate" tick={{ fontSize: 11 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={shortMoney} tick={{ fontSize: 11 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 16px rgba(0,0,0,.08)" }}
                      formatter={(v, name) => [formatMoney(Number(v)), String(name) === "revenue" ? "Doanh thu" : "Lợi nhuận"]}
                      labelFormatter={(l) => `Ngày ${l}`}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gRevenue)" dot={false} activeDot={{ r: 5, fill: "#3b82f6" }} />
                    <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fill="url(#gProfit)" dot={false} activeDot={{ r: 4, fill: "#10b981" }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Order status donut */}
            <div className="bg-white rounded-2xl border border-divider shadow-soft-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <PieChartIcon size={18} className="text-violet-500" />
                <h3 className="font-bold text-ink">Trạng thái đơn</h3>
              </div>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatNumber(Number(v))} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Mini stats */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                {statusData.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 p-2 rounded-lg bg-canvas">
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-xs text-muted">{s.name}</span>
                    <span className="ml-auto text-xs font-bold text-ink">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ Charts Row 2 : Category bar chart + Top products ═══ */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            {/* Category revenue bar */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-divider shadow-soft-md p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 size={18} className="text-cyan-500" />
                <h3 className="font-bold text-ink">Doanh thu theo danh mục</h3>
              </div>
              {categoryChartData.length === 0 ? (
                <div className="flex items-center justify-center h-56 text-sm text-disabled">
                  Chưa có doanh thu danh mục
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryChartData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tickFormatter={shortMoney} tick={{ fontSize: 11 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} stroke="#94a3b8" axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v) => formatMoney(Number(v))} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0" }} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                        {categoryChartData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Top products ranking */}
            <div className="bg-white rounded-2xl border border-divider shadow-soft-md p-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={18} className="text-amber-500" />
                <h3 className="font-bold text-ink">Top sản phẩm</h3>
              </div>
              {topProducts.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-sm text-disabled">
                  Chưa có dữ liệu
                </div>
              ) : (
                <div className="space-y-3">
                  {topProducts.map((product, i) => {
                    const maxRev = topProducts[0]?.revenue || 1;
                    const pct = (product.revenue / maxRev) * 100;
                    return (
                      <div key={product.name} className="group">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold text-white ${
                              i === 0
                                ? "bg-gradient-to-br from-amber-400 to-amber-600"
                                : i === 1
                                  ? "bg-gradient-to-br from-disabled to-muted"
                                  : i === 2
                                    ? "bg-gradient-to-br from-orange-300 to-orange-500"
                                    : "bg-brand-100/50 text-muted"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <p className="flex-1 text-sm font-medium text-ink truncate group-hover:text-brand-600 transition-colors">
                            {product.name}
                          </p>
                          <span className="text-xs font-bold text-ink whitespace-nowrap">
                            {formatMoney(product.revenue)}
                          </span>
                        </div>
                        <div className="h-1.5 bg-brand-100/40 rounded-full overflow-hidden ml-10">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              background: `linear-gradient(90deg, ${CHART_COLORS[i % CHART_COLORS.length]}, ${CHART_COLORS[(i + 1) % CHART_COLORS.length]})`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ═══ Daily Statistics Chart ═══ */}
          <DailyStatsChart dailyChartData={dailyChartData} />
        </>
      )}
    </div>
  );
}

/* ─── Daily Stats Chart + Table toggle ─── */
function DailyStatsChart({
  dailyChartData,
}: {
  dailyChartData: Array<{
    date: string;
    shortDate: string;
    revenue: number;
    cost: number;
    profit: number;
    orderCount: number;
    shippedOrders: number;
  }>;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");

  return (
    <div className="bg-white rounded-2xl border border-divider shadow-soft-md overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-divider">
        <CalendarDays size={18} className="text-brand-500" />
        <h3 className="font-bold text-ink">Chi tiết theo ngày</h3>
        <span className="text-xs text-disabled ml-1">{dailyChartData.length} ngày</span>

        {/* View toggle */}
        <div className="ml-auto flex items-center bg-brand-100/40 rounded-lg p-0.5">
          <button
            onClick={() => setView("chart")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              view === "chart"
                ? "bg-white text-brand-600 shadow-sm"
                : "text-muted hover:text-ink/80"
            }`}
          >
            <BarChart3 size={13} />
            Chart
          </button>
          <button
            onClick={() => setView("table")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              view === "table"
                ? "bg-white text-brand-600 shadow-sm"
                : "text-muted hover:text-ink/80"
            }`}
          >
            <TableProperties size={13} />
            Bảng
          </button>
        </div>
      </div>

      {view === "chart" ? (
        <div className="p-6">
          {dailyChartData.length === 0 ? (
            <div className="flex items-center justify-center h-56 text-sm text-disabled">
              Không có dữ liệu trong khoảng thời gian này
            </div>
          ) : (
            <>
              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-xs mb-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-brand-500" />
                  Doanh thu
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-orange-400" />
                  Chi phí
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                  Lợi nhuận
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-1 rounded-full bg-violet-500" />
                  Số đơn
                </span>
              </div>

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={dailyChartData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gDailyProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="shortDate"
                      tick={{ fontSize: 11 }}
                      stroke="#94a3b8"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="money"
                      tickFormatter={shortMoney}
                      tick={{ fontSize: 11 }}
                      stroke="#94a3b8"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="orders"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                      stroke="#8b5cf6"
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        boxShadow: "0 4px 16px rgba(0,0,0,.08)",
                        fontSize: 12,
                      }}
                      formatter={(v: unknown, name: unknown) => {
                        const labels: Record<string, string> = {
                          revenue: "Doanh thu",
                          cost: "Chi phí",
                          profit: "Lợi nhuận",
                          orderCount: "Số đơn",
                        };
                        const n = String(name);
                        return [
                          n === "orderCount"
                            ? formatNumber(Number(v))
                            : formatMoney(Number(v)),
                          labels[n] ?? n,
                        ];
                      }}
                      labelFormatter={(l) => `Ngày ${l}`}
                    />
                    <Bar
                      yAxisId="money"
                      dataKey="revenue"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                      barSize={14}
                      opacity={0.85}
                    />
                    <Bar
                      yAxisId="money"
                      dataKey="cost"
                      fill="#fb923c"
                      radius={[4, 4, 0, 0]}
                      barSize={14}
                      opacity={0.7}
                    />
                    <Area
                      yAxisId="money"
                      type="monotone"
                      dataKey="profit"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill="url(#gDailyProfit)"
                      dot={false}
                      activeDot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                    />
                    <Line
                      yAxisId="orders"
                      type="monotone"
                      dataKey="orderCount"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={false}
                      activeDot={{ r: 4, fill: "#8b5cf6", stroke: "#fff", strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      ) : (
        /* Table view */
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-canvas/80">
                <th className="px-6 py-3 text-left font-bold text-muted uppercase tracking-wider text-xs">Ngày</th>
                <th className="px-6 py-3 text-right font-bold text-muted uppercase tracking-wider text-xs">Doanh thu</th>
                <th className="px-6 py-3 text-right font-bold text-muted uppercase tracking-wider text-xs">Chi phí</th>
                <th className="px-6 py-3 text-right font-bold text-muted uppercase tracking-wider text-xs">Lợi nhuận</th>
                <th className="px-6 py-3 text-center font-bold text-muted uppercase tracking-wider text-xs">Đơn</th>
                <th className="px-6 py-3 text-center font-bold text-muted uppercase tracking-wider text-xs">Đã giao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {dailyChartData.map((row) => (
                <tr key={row.date} className="hover:bg-brand-50/40 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-ink">{row.date}</td>
                  <td className="px-6 py-3.5 text-right text-ink/80">{formatMoney(row.revenue)}</td>
                  <td className="px-6 py-3.5 text-right text-muted">{formatMoney(row.cost)}</td>
                  <td className="px-6 py-3.5 text-right">
                    <span className={row.profit >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                      {formatMoney(row.profit)}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-center text-ink/80">{row.orderCount}</td>
                  <td className="px-6 py-3.5 text-center text-ink/80">{row.shippedOrders}</td>
                </tr>
              ))}
              {dailyChartData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-disabled">
                    Không có dữ liệu trong khoảng thời gian này
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── KPI Card ─── */
function KpiCard({
  icon,
  iconClass,
  borderClass,
  label,
  value,
  sub,
  badge,
}: {
  icon: React.ReactNode;
  iconClass: string;
  borderClass: string;
  label: string;
  value: string;
  sub?: string;
  badge?: { text: string; positive: boolean };
}) {
  return (
    <div
      className={`relative bg-white rounded-2xl border border-divider shadow-soft-md p-5 border-l-4 ${borderClass} transition-all hover:shadow-soft-lg group`}
    >
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${iconClass}`}>{icon}</div>
        {badge && (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
              badge.positive
                ? "bg-emerald-50 text-emerald-600"
                : "bg-red-50 text-red-600"
            }`}
          >
            {badge.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {badge.text}
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-semibold text-disabled uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-ink tracking-tight">{value}</p>
      {sub && <p className="mt-2 text-xs text-disabled">{sub}</p>}
    </div>
  );
}

/* ─── Loading skeleton ─── */
function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-divider p-5 h-36">
            <div className="h-10 w-10 bg-brand-100/40 rounded-xl mb-3" />
            <div className="h-3 w-20 bg-brand-100/40 rounded mb-2" />
            <div className="h-6 w-28 bg-brand-100/40 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-divider p-6 h-80" />
        <div className="bg-white rounded-2xl border border-divider p-6 h-80" />
      </div>
    </div>
  );
}
