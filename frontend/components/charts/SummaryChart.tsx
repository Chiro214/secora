'use client';

import React from 'react';
import { RadialBarChart, RadialBar, Legend, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
    { name: 'Low', count: 10, fill: '#5AA7FF' },
    { name: 'Medium', count: 5, fill: '#FFB800' },
    { name: 'High', count: 2, fill: '#FF3333' },
];

export function SummaryChart({ stats }: { stats?: { high: number, medium: number, low: number } }) {
    const chartData = stats ? [
        { name: 'Low', count: stats.low, fill: '#5AA7FF' },
        { name: 'Medium', count: stats.medium, fill: '#FFB800' },
        { name: 'High', count: stats.high, fill: '#FF3333' },
    ] : data;

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="80%" barSize={10} data={chartData}>
                    <RadialBar
                        label={{ position: 'insideStart', fill: '#fff' }}
                        background
                        dataKey="count"
                    />
                    <Legend iconSize={10} layout="vertical" verticalAlign="middle" wrapperStyle={{ right: 0 }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0a1224', border: '1px solid rgba(90, 167, 255, 0.1)', borderRadius: '8px' }}
                        itemStyle={{ color: '#fff' }}
                    />
                </RadialBarChart>
            </ResponsiveContainer>
        </div>
    );
}
