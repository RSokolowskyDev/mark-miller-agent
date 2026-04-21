export default function EmailLog({ items }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#d9e2f0] bg-white">
      <table className="w-full text-left text-xs">
        <thead className="bg-[#f8fbff]">
          <tr>
            <th className="px-3 py-2.5 font-semibold text-slate-600">Lead Name</th>
            <th className="px-3 py-2.5 font-semibold text-slate-600">Email #</th>
            <th className="px-3 py-2.5 font-semibold text-slate-600">Subject</th>
            <th className="px-3 py-2.5 font-semibold text-slate-600">Sent At</th>
            <th className="px-3 py-2.5 font-semibold text-slate-600">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className="border-t border-slate-100">
              <td className="px-3 py-2.5 text-sm font-medium text-slate-800">{item.leadName}</td>
              <td className="px-3 py-2.5 text-sm text-slate-700">{item.emailNumber}</td>
              <td className="px-3 py-2.5 text-sm text-slate-700">{item.subject}</td>
              <td className="px-3 py-2.5 text-sm text-slate-700">{item.sentAt}</td>
              <td className="px-3 py-2.5 text-sm capitalize text-slate-700">{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
