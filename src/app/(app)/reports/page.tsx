"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, FileText } from "lucide-react";
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

const complianceData = [
  { month: 'Jan', score: 92 },
  { month: 'Feb', score: 94 },
  { month: 'Mar', score: 95 },
  { month: 'Apr', score: 93 },
  { month: 'May', score: 96 },
  { month: 'Jun', score: 95 },
  { month: 'Jul', score: 97 },
];

const flaggedData = [
  { month: 'Jan', count: 5 },
  { month: 'Feb', count: 3 },
  { month: 'Mar', count: 2 },
  { month: 'Apr', count: 4 },
  { month: 'May', count: 1 },
  { month: 'Jun', count: 2 },
  { month: 'Jul', count: 1 },
];

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Compliance Reports</h1>
          <p className="text-muted-foreground">Visualize compliance trends and generate reports.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
            </Button>
            <Button>
                <FileText className="mr-2 h-4 w-4" />
                Generate PDF Report
            </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Compliance Score Over Time</CardTitle>
            <CardDescription>Monthly compliance score based on automated checks.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={complianceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis unit="%" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Flagged Items by Month</CardTitle>
            <CardDescription>Number of items flagged for compliance violations.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={flaggedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
