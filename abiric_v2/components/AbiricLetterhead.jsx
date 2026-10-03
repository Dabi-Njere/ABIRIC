// Geometric forest-green + black mark with a thin salmon accent — the
// brand's original spec (dark forest green and black geometric design,
// diagonal split, corner accent) rendered as a clean inline SVG so it
// prints crisply at any size with no external image dependency.
function AbiricMark({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="44" height="44" rx="8" fill="#101312" />
      <path d="M2 10a8 8 0 0 1 8-8h34v44H10a8 8 0 0 1-8-8V10z" fill="#173D32" />
      <path d="M2 10a8 8 0 0 1 8-8h22L2 32V10z" fill="#245447" />
      <rect x="2" y="2" width="44" height="44" rx="8" fill="none" stroke="#F28C82" strokeWidth="1.5" />
      <path d="M14 14l20 20M34 14L14 34" stroke="#F28C82" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
    </svg>
  );
}

// company is the row from company_settings (or null if the migration hasn't
// been applied / nothing has been filled in yet — falls back to sensible
// defaults rather than leaving blanks on a document meant to go to a client
// or an accountant).
export default function AbiricLetterhead({ company }) {
  const legalName = company?.legal_name || "ABIRIC INC.";
  const operatingName = company?.operating_name;
  const address = company?.address;
  const phone = company?.phone;
  const email = company?.email;
  const businessNumber = company?.business_number;
  const gstNumber = company?.gst_hst_number;

  return (
    <div className="flex items-start justify-between border-b-2 border-[#173D32] pb-5">
      <div className="flex items-center gap-4">
        <AbiricMark size={52} />
        <div>
          <p className="text-xl font-black tracking-[0.1em] text-[#101312]">{legalName}</p>
          {operatingName && operatingName !== legalName && (
            <p className="text-sm text-[#4b564f]">{operatingName}</p>
          )}
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F28C82]">
            Striving for Excellence
          </p>
        </div>
      </div>

      <div className="text-right text-[11px] leading-5 text-[#4b564f]">
        {address && <p>{address}</p>}
        {phone && <p>{phone}</p>}
        {email && <p>{email}</p>}
        {businessNumber && <p>BN: {businessNumber}</p>}
        {gstNumber && <p>GST/HST: {gstNumber}</p>}
      </div>
    </div>
  );
}
