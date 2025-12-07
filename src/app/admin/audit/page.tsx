'use client';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AuditLogsPage() {
  const { data } = useSWR('/api/admin/audit', fetcher);

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">Audit Logs</h1>
      <div className="grid gap-2">
        {(data?.list || []).length === 0 ? (
          <p className="text-gray-500">No audit logs yet.</p>
        ) : (
          (data?.list || []).map((log: any) => (
            <div key={log.id} className="card">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-semibold">{log.action}</div>
                  <div className="text-sm text-gray-600">
                    {log.resourceType} #{log.resourceId}
                    {log.actor && ` · Actor: ${log.actor.name} (${log.actor.email})`}
                    {!log.actor && ` · Actor ID: ${log.actorId}`}
                    {log.requestor && ` · Requestor: ${log.requestor.name} (${log.requestor.email})`}
                    {log.approver && ` · Approver: ${log.approver.name} (${log.approver.email})`}
                    {log.theme && ` · Theme: ${log.theme}`}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {new Date(log.createdAt).toLocaleString()}
                    {log.userAgent && ` · ${log.userAgent}`}
                  </div>
                  {log.beforeJson && (
                    <details className="mt-2">
                      <summary className="text-sm text-gray-600 cursor-pointer">Before</summary>
                      <pre className="text-xs bg-gray-50 p-2 mt-1 rounded overflow-auto">{JSON.stringify(JSON.parse(log.beforeJson), null, 2)}</pre>
                    </details>
                  )}
                  {log.afterJson && (
                    <details className="mt-2">
                      <summary className="text-sm text-gray-600 cursor-pointer">After</summary>
                      <pre className="text-xs bg-gray-50 p-2 mt-1 rounded overflow-auto">{JSON.stringify(JSON.parse(log.afterJson), null, 2)}</pre>
                    </details>
                  )}
                </div>
                <span className={`px-2 py-1 rounded text-sm ${log.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                  {log.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

