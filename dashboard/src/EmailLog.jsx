export default function EmailLog({ items }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="p-3">Lead Name</th>
            <th className="p-3">Email #</th>
            <th className="p-3">Subject</th>
            <th className="p-3">Sent At</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className="border-t">
              <td className="p-3">{item.leadName}</td>
              <td className="p-3">{item.emailNumber}</td>
              <td className="p-3">{item.subject}</td>
              <td className="p-3">{item.sentAt}</td>
              <td className="p-3">{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}