export default function PrintLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#e9e9e4] py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-[850px] print:max-w-none">{children}</div>
    </div>
  );
}
