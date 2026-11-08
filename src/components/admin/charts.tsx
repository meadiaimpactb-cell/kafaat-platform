'use client';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';

export function RevenueChart({ data }: { data: { m: string; v: number }[] }) {
  return (
    <div className="h-64 w-full" dir="ltr">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#E6EEE2" />
          <XAxis dataKey="m" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#5E6E64' }} reversed />
          <YAxis orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#5E6E64' }} width={48} tickFormatter={v => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
          <Tooltip cursor={{ fill: '#F1F6EE' }} formatter={v => [`${Number(v ?? 0).toLocaleString('en-US')} ر.س`, 'الإيراد']} contentStyle={{ borderRadius: 12, border: '1px solid #E2E8DE', direction: 'rtl', fontFamily: 'inherit' }} />
          <Bar dataKey="v" radius={[6, 6, 0, 0]} maxBarSize={34}>{data.map((d, i) => <Cell key={i} fill={i === data.length - 1 ? '#C4D42A' : '#0B5233'} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
