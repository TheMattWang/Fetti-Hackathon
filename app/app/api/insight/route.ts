import { NextRequest, NextResponse } from 'next/server';
import { VizPayload } from '@/types/viz';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  // Mock response 1: Trend with forecast
  if (query.toLowerCase().includes('trend') || query.toLowerCase().includes('forecast')) {
    const mockTrendData: VizPayload = {
      plan: {
        intent: "forecast",
        question: "Show weekly active users by plan for last quarter, forecast next 2 weeks",
        dataset: "users",
        sql: "SELECT week, plan, active_users, y_lower, y_upper FROM weekly_plan_usage WHERE week >= '2023-10-01'",
        fields: [
          { name: "week", type: "time" },
          { name: "plan", type: "cat" },
          { name: "active_users", type: "quant" },
          { name: "y_lower", type: "quant" },
          { name: "y_upper", type: "quant" }
        ],
        chart: {
          type: "line",
          x: "week",
          y: "active_users",
          series: "plan",
          confidence: { field: "active_users", lower: "y_lower", upper: "y_upper" },
          tooltip: ["week", "plan", "active_users"]
        },
        narrative: "Weekly active users show steady growth across all plans, with premium plans leading the trend. The forecast indicates continued growth with 95% confidence intervals.",
        quality: { rowCount: 24, rowCountCapHit: false, warnings: [] }
      },
      rows: [
        { week: "2023-10-02", plan: "Free", active_users: 1250, y_lower: 1200, y_upper: 1300 },
        { week: "2023-10-09", plan: "Free", active_users: 1320, y_lower: 1270, y_upper: 1370 },
        { week: "2023-10-16", plan: "Free", active_users: 1380, y_lower: 1330, y_upper: 1430 },
        { week: "2023-10-23", plan: "Free", active_users: 1450, y_lower: 1400, y_upper: 1500 },
        { week: "2023-10-30", plan: "Free", active_users: 1520, y_lower: 1470, y_upper: 1570 },
        { week: "2023-11-06", plan: "Free", active_users: 1580, y_lower: 1530, y_upper: 1630 },
        { week: "2023-11-13", plan: "Free", active_users: 1650, y_lower: 1600, y_upper: 1700 },
        { week: "2023-11-20", plan: "Free", active_users: 1720, y_lower: 1670, y_upper: 1770 },
        { week: "2023-11-27", plan: "Free", active_users: 1780, y_lower: 1730, y_upper: 1830 },
        { week: "2023-12-04", plan: "Free", active_users: 1850, y_lower: 1800, y_upper: 1900 },
        { week: "2023-12-11", plan: "Free", active_users: 1920, y_lower: 1870, y_upper: 1970 },
        { week: "2023-12-18", plan: "Free", active_users: 1980, y_lower: 1930, y_upper: 2030 },
        { week: "2023-10-02", plan: "Pro", active_users: 450, y_lower: 420, y_upper: 480 },
        { week: "2023-10-09", plan: "Pro", active_users: 480, y_lower: 450, y_upper: 510 },
        { week: "2023-10-16", plan: "Pro", active_users: 520, y_lower: 490, y_upper: 550 },
        { week: "2023-10-23", plan: "Pro", active_users: 560, y_lower: 530, y_upper: 590 },
        { week: "2023-10-30", plan: "Pro", active_users: 600, y_lower: 570, y_upper: 630 },
        { week: "2023-11-06", plan: "Pro", active_users: 640, y_lower: 610, y_upper: 670 },
        { week: "2023-11-13", plan: "Pro", active_users: 680, y_lower: 650, y_upper: 710 },
        { week: "2023-11-20", plan: "Pro", active_users: 720, y_lower: 690, y_upper: 750 },
        { week: "2023-11-27", plan: "Pro", active_users: 760, y_lower: 730, y_upper: 790 },
        { week: "2023-12-04", plan: "Pro", active_users: 800, y_lower: 770, y_upper: 830 },
        { week: "2023-12-11", plan: "Pro", active_users: 840, y_lower: 810, y_upper: 870 },
        { week: "2023-12-18", plan: "Pro", active_users: 880, y_lower: 850, y_upper: 910 }
      ]
    };
    return NextResponse.json(mockTrendData);
  }

  // Mock response 2: Map/Choropleth
  if (query.toLowerCase().includes('map') || query.toLowerCase().includes('state') || query.toLowerCase().includes('country')) {
    const mockMapData: VizPayload = {
      plan: {
        intent: "map",
        question: "Revenue by state last month (map)",
        dataset: "revenue",
        sql: "SELECT state, revenue FROM monthly_revenue WHERE month = '2023-12'",
        fields: [
          { name: "state", type: "geo" },
          { name: "revenue", type: "quant" }
        ],
        chart: {
          type: "choropleth",
          x: "state",
          y: "revenue",
          tooltip: ["state", "revenue"]
        },
        narrative: "Revenue distribution shows strong performance in coastal states, with California leading at $2.4M followed by New York and Texas.",
        quality: { rowCount: 50, rowCountCapHit: false, warnings: [] }
      },
      rows: [
        { state: "CA", revenue: 2400000 },
        { state: "NY", revenue: 1800000 },
        { state: "TX", revenue: 1600000 },
        { state: "FL", revenue: 1200000 },
        { state: "IL", revenue: 950000 },
        { state: "PA", revenue: 880000 },
        { state: "OH", revenue: 750000 },
        { state: "GA", revenue: 720000 },
        { state: "NC", revenue: 680000 },
        { state: "MI", revenue: 620000 },
        { state: "NJ", revenue: 580000 },
        { state: "VA", revenue: 540000 },
        { state: "WA", revenue: 520000 },
        { state: "AZ", revenue: 480000 },
        { state: "MA", revenue: 460000 },
        { state: "TN", revenue: 420000 },
        { state: "IN", revenue: 380000 },
        { state: "MO", revenue: 360000 },
        { state: "MD", revenue: 340000 },
        { state: "WI", revenue: 320000 },
        { state: "CO", revenue: 300000 },
        { state: "MN", revenue: 280000 },
        { state: "SC", revenue: 260000 },
        { state: "AL", revenue: 240000 },
        { state: "LA", revenue: 220000 },
        { state: "KY", revenue: 200000 },
        { state: "OR", revenue: 180000 },
        { state: "OK", revenue: 160000 },
        { state: "CT", revenue: 140000 },
        { state: "UT", revenue: 120000 },
        { state: "IA", revenue: 100000 },
        { state: "NV", revenue: 90000 },
        { state: "AR", revenue: 80000 },
        { state: "MS", revenue: 70000 },
        { state: "KS", revenue: 60000 },
        { state: "NM", revenue: 50000 },
        { state: "NE", revenue: 40000 },
        { state: "WV", revenue: 30000 },
        { state: "ID", revenue: 25000 },
        { state: "HI", revenue: 20000 },
        { state: "NH", revenue: 18000 },
        { state: "ME", revenue: 15000 },
        { state: "RI", revenue: 12000 },
        { state: "MT", revenue: 10000 },
        { state: "DE", revenue: 8000 },
        { state: "SD", revenue: 6000 },
        { state: "ND", revenue: 4000 },
        { state: "AK", revenue: 2000 },
        { state: "VT", revenue: 1000 },
        { state: "WY", revenue: 500 }
      ]
    };
    return NextResponse.json(mockMapData);
  }

  // Default response: Bar chart
  const mockBarData: VizPayload = {
    plan: {
      intent: "describe",
      question: "Top categories by revenue",
      dataset: "products",
      sql: "SELECT category, SUM(revenue) as total_revenue FROM products GROUP BY category ORDER BY total_revenue DESC LIMIT 10",
      fields: [
        { name: "category", type: "cat" },
        { name: "total_revenue", type: "quant" }
      ],
      chart: {
        type: "bar",
        x: "category",
        y: "total_revenue",
        sort: "desc",
        tooltip: ["category", "total_revenue"]
      },
      narrative: "Product categories show clear performance differences, with Electronics leading at $1.2M followed by Clothing and Home & Garden.",
      quality: { rowCount: 10, rowCountCapHit: false, warnings: [] }
    },
    rows: [
      { category: "Electronics", total_revenue: 1200000 },
      { category: "Clothing", total_revenue: 950000 },
      { category: "Home & Garden", total_revenue: 780000 },
      { category: "Sports", total_revenue: 650000 },
      { category: "Books", total_revenue: 520000 },
      { category: "Beauty", total_revenue: 480000 },
      { category: "Toys", total_revenue: 420000 },
      { category: "Automotive", total_revenue: 380000 },
      { category: "Health", total_revenue: 320000 },
      { category: "Food", total_revenue: 280000 }
    ]
  };

  return NextResponse.json(mockBarData);
}
