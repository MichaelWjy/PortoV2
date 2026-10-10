import { analyticsSummary, ANALYTICS_RETENTION_DAYS } from "@/lib/services/analytics";
import { Empty, PageHeader } from "@/components/admin/ui";

export const metadata = { title: "Analytics" };

function TopTable({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  return (
    <section className="adm-card">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <Empty>No data yet.</Empty>
      ) : (
        <table className="adm-table">
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col" style={{ textAlign: "right" }}>
                Count
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td style={{ wordBreak: "break-all" }}>{r.label}</td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export default async function AnalyticsPage() {
  const s = await analyticsSummary(30);
  return (
    <>
      <PageHeader
        title="Analytics"
        description={`First-party, cookieless measurements for the last ${s.days} days. Visitors who send Do Not Track or Global Privacy Control are not counted. Events are deleted after ${ANALYTICS_RETENTION_DAYS} days.`}
      />
      <div className="adm-stats">
        <div className="adm-stat">
          <b>{s.pageViews}</b>
          <span>Page views</span>
        </div>
        <div className="adm-stat">
          <b>{s.visitorDays}</b>
          <span>Visitor-days (daily unique visitors, summed)</span>
        </div>
      </div>
      <div className="adm-grid2">
        <TopTable title="Top pages" rows={s.topPaths} />
        <TopTable title="Top projects" rows={s.topProjects} />
        <TopTable title="Referrers" rows={s.topReferrers} />
        <TopTable title="Page views per day" rows={s.daily.map((d) => ({ label: d.day, count: d.views }))} />
      </div>
    </>
  );
}
