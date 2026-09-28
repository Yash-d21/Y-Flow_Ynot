export default function ClientHelpPage() {
  return (
    <div className="flex-1 overflow-auto bg-white p-4 sm:p-6">
      <h1 className="text-xl font-semibold">Help</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-600">
        Use the chat bubble in the bottom-right corner to ask questions or request a human from
        the Y-Not team. For proof reviews, open <strong>Approvals</strong> or the order detail
        page and choose Approve or Request Changes.
      </p>
      <ul className="mt-6 list-disc space-y-2 pl-5 text-sm text-slate-600">
        <li>Phone: +1 855-843-1422</li>
        <li>Typical reply window after a brief: within one business day</li>
        <li>Never share payment card details in chat</li>
      </ul>
    </div>
  );
}
