"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ShieldAlert } from "lucide-react";

const securityEventsData = [
  { time: "12:00", events: 2 },
  { time: "13:00", events: 5 },
  { time: "14:00", events: 3 },
  { time: "15:00", events: 8 },
  { time: "16:00", events: 4 },
  { time: "17:00", events: 6 },
  { time: "18:00", events: 10 },
];

const recentAlerts = [
    { id: 'ALERT-01', description: 'Multiple failed login attempts for admin@auditlens.com', severity: 'High', time: '2 min ago' },
    { id: 'ALERT-02', description: 'Unusual API usage from IP 192.168.1.100', severity: 'Medium', time: '15 min ago' },
    { id: 'ALERT-03', description: 'Potential SQL injection attempt detected', severity: 'High', time: '1 hour ago' },
    { id: 'ALERT-04', description: 'New device login for auditor@auditlens.com', severity: 'Low', time: '3 hours ago' },
];

export default function SecurityPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Security Dashboard</h1>
        <p className="text-muted-foreground">Monitor security events and potential threats in real-time.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Security Events Over Time</CardTitle>
                <CardDescription>Number of security events detected per hour.</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={securityEventsData}>
                    <defs>
                        <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="time" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Area type="monotone" dataKey="events" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorEvents)" />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShieldAlert className="text-destructive"/>
                    Active Threats
                </CardTitle>
                <CardDescription>Currently active and unaddressed threats.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center h-[250px]">
                <div className="text-6xl font-bold text-destructive">3</div>
                <p className="text-muted-foreground mt-2">High-severity alerts require attention</p>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Security Alerts</CardTitle>
          <CardDescription>A log of the latest security alerts and events.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentAlerts.map(alert => (
                <TableRow key={alert.id}>
                  <TableCell>{alert.description}</TableCell>
                  <TableCell>
                    <Badge variant={alert.severity === 'High' ? 'destructive' : alert.severity === 'Medium' ? 'outline' : 'secondary'}>
                      {alert.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{alert.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
