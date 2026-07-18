import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import './ChartModal.css';

const revenueData = [
  { week: 'W1', value: 18200 },
  { week: 'W2', value: 19500 },
  { week: 'W3', value: 17800 },
  { week: 'W4', value: 21000 },
  { week: 'W5', value: 20400 },
  { week: 'W6', value: 22100 },
  { week: 'W7', value: 23600 },
  { week: 'W8', value: 24830 },
];

const customerData = [
  { week: 'W1', value: 940 },
  { week: 'W2', value: 988 },
  { week: 'W3', value: 1020 },
  { week: 'W4', value: 1054 },
  { week: 'W5', value: 1103 },
  { week: 'W6', value: 1175 },
  { week: 'W7', value: 1230 },
  { week: 'W8', value: 1284 },
];

const config = {
  revenue: {
    title: 'Total Revenue Growth',
    data: revenueData,
    color: '#27ae60',
    label: 'Revenue ($)',
    format: (v: number) => `$${v.toLocaleString()}`,
  },
  customers: {
    title: 'Active Customers Growth',
    data: customerData,
    color: '#3b82f6',
    label: 'Customers',
    format: (v: number) => v.toLocaleString(),
  },
};

interface ChartModalProps {
  type: 'revenue' | 'customers';
  onClose: () => void;
}

export default function ChartModal({ type, onClose }: ChartModalProps) {
  const { title, data, color, format } = config[type];

  return (
    <div className="chart-backdrop" onClick={onClose}>
      <div className="chart-card" onClick={(e) => e.stopPropagation()}>
        <button className="chart-close" onClick={onClose} aria-label="Close">✕</button>
        <h2 className="chart-title">{title}</h2>
        <p className="chart-subtitle">Last 8 weeks</p>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f2" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 12, fill: '#aaa', fontFamily: 'Space Grotesk, sans-serif' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={format}
              tick={{ fontSize: 11, fill: '#aaa', fontFamily: 'Space Grotesk, sans-serif' }}
              axisLine={false}
              tickLine={false}
              width={74}
            />
            <Tooltip
              formatter={(value) => [format(value as number), title.split(' ')[0] + ' ' + title.split(' ')[1]]}
              contentStyle={{
                borderRadius: '10px',
                border: '1px solid #e8e8ec',
                fontSize: '13px',
                fontFamily: 'Space Grotesk, sans-serif',
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2.5}
              dot={{ r: 4, fill: color, strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
