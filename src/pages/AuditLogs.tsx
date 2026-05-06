import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ShieldAlert } from 'lucide-react';

interface AuditLog {
  log_id: number;
  timestamp: string;
  actor_type: string;
  actor_id: number;
  action: string;
  details: string;
  ip_address: string;
  actor_name?: string;
  ec_role?: string;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch('/api/audit-logs')
      .then(res => res.json())
      .then(data => {
        setLogs(data);
        setLoading(false);
      });
  }, []);

  const filteredLogs = logs.filter(log => 
    log.action.toLowerCase().includes(filter.toLowerCase()) ||
    log.details.toLowerCase().includes(filter.toLowerCase()) ||
    log.actor_type.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) return <div>Loading audit logs...</div>;

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Audit Logs</h1>
          <p className="text-neutral-500">Immutable record of all critical system actions.</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-500" />
          <Input 
            placeholder="Filter logs..." 
            className="pl-8" 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </header>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.map((log) => (
              <TableRow key={log.log_id}>
                <TableCell className="text-xs font-mono text-neutral-500">
                  {new Date(log.timestamp).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={log.actor_type === 'it' ? 'destructive' : log.actor_type === 'ec' ? 'default' : 'secondary'}>
                      {log.actor_type.toUpperCase()}
                    </Badge>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{log.actor_name || `ID: ${log.actor_id}`}</span>
                      {log.ec_role && <span className="text-[10px] text-neutral-400 capitalize">{log.ec_role.replace('_', ' ')}</span>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-semibold">{log.action}</TableCell>
                <TableCell className="text-sm text-neutral-600">{log.details}</TableCell>
                <TableCell className="text-xs font-mono text-neutral-400">{log.ip_address}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filteredLogs.length === 0 && (
          <div className="py-12 text-center">
            <ShieldAlert className="w-12 h-12 mx-auto text-neutral-200 mb-2" />
            <p className="text-neutral-500">No logs found matching your filter.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
