import { useParams } from "wouter";
import { BarChart2, TrendingUp, CheckCircle2, Users } from "lucide-react";
import { useGetForm, useGetFormStats, getGetFormQueryKey, getGetFormStatsQueryKey } from "@workspace/api-client-react";
import { FormLayout } from "@/components/layout/FormLayout";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function FormStats() {
  const { id } = useParams<{ id: string }>();

  const { data: form } = useGetForm(id, { query: { queryKey: getGetFormQueryKey(id) } });
  const { data: stats, isLoading } = useGetFormStats(id, { query: { queryKey: getGetFormStatsQueryKey(id) } });

  return (
    <FormLayout formId={id} formTitle={form?.title}>
      <div className="h-full overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">Analytics</h2>

          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !stats ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <BarChart2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No data available yet.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard icon={Users} label="Total Responses" value={stats.totalResponses} />
                <StatCard icon={CheckCircle2} label="Completed" value={stats.completedResponses} />
                <StatCard
                  icon={TrendingUp}
                  label="Completion Rate"
                  value={`${Math.round(stats.completionRate * 100)}%`}
                />
                <StatCard
                  icon={BarChart2}
                  label="Questions"
                  value={stats.questionStats.length}
                />
              </div>

              {/* Responses over time */}
              {stats.responsesPerDay.length > 0 && (
                <div className="bg-card border border-card-border rounded-xl p-5 mb-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4">Responses over last 30 days</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={stats.responsesPerDay.map((d) => ({ ...d, date: format(parseISO(d.date), "MMM d") }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: 12,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Question stats */}
              {stats.questionStats.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Question Breakdown</h3>
                  {stats.questionStats.map((qStat) => (
                    <div key={qStat.questionId} className="bg-card border border-card-border rounded-xl p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{qStat.questionTitle}</p>
                          <p className="text-xs text-muted-foreground capitalize">{qStat.type.replace("_", " ")}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">{qStat.answerCount} answers</span>
                      </div>

                      {qStat.topAnswers.length > 0 && (
                        <div className="mt-3">
                          {["multiple_choice", "checkbox", "dropdown", "yes_no", "rating"].includes(qStat.type) ? (
                            <ResponsiveContainer width="100%" height={Math.max(80, qStat.topAnswers.length * 32)}>
                              <BarChart
                                data={qStat.topAnswers}
                                layout="vertical"
                                margin={{ left: 0, right: 20, top: 0, bottom: 0 }}
                              >
                                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                                <YAxis type="category" dataKey="value" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={100} />
                                <Tooltip
                                  contentStyle={{
                                    background: "hsl(var(--card))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "8px",
                                    fontSize: 12,
                                  }}
                                />
                                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="space-y-2">
                              {qStat.topAnswers.slice(0, 5).map((ans, i) => (
                                <div key={i} className="flex items-center gap-3">
                                  <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                                  <span className="text-sm text-foreground flex-1 truncate">{ans.value}</span>
                                  <span className="text-xs text-muted-foreground shrink-0">{ans.count}x</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </FormLayout>
  );
}
