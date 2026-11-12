import type { Metadata } from "next";
import { MapPin, Phone, Clock, Navigation, Building2 } from "lucide-react";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Store location", description: "Visit the Gnananetra store in Bhavanipuram, Vijayawada." };

export default async function StoreLocationPage() {
  const { store } = await getSettings();
  const q = encodeURIComponent(store.mapQuery || store.storeAddress);
  return (
    <div className="wrap py-10">
      <p className="eyebrow">Visit us</p>
      <h1 className="mt-2 text-[32px] font-extrabold tracking-[-0.025em]">Store location</h1>
      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="card overflow-hidden">
          <iframe
            title="Map to the Gnananetra store"
            src={`https://maps.google.com/maps?q=${q}&z=15&output=embed`}
            className="h-[360px] w-full sm:h-[460px]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <div className="space-y-4">
          <div className="card p-6">
            <p className="flex items-start gap-3 text-[15px]">
              <MapPin className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
              <span>
                <span className="block font-extrabold">{store.legalName}</span>
                <span className="text-muted">{store.storeAddress}</span>
              </span>
            </p>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${q}`} target="_blank" rel="noopener" className="btn-primary mt-5">
              <Navigation className="size-4" aria-hidden /> Get directions
            </a>
          </div>
          <div className="card space-y-4 p-6 text-[14.5px]">
            <a href={`tel:${store.phone.replace(/\s/g, "")}`} className="-my-2 flex items-center gap-3 py-2 hover:text-brand-700">
              <Phone className="size-5 text-brand-700" aria-hidden /> {store.phone}
            </a>
            <p className="flex items-center gap-3">
              <Clock className="size-5 text-brand-700" aria-hidden /> {store.supportHours}
            </p>
            {store.headOfficeAddress && (
              <p className="flex items-start gap-3">
                <Building2 className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
                <span>
                  <span className="block font-bold">Head office</span>
                  <span className="text-muted">{store.headOfficeAddress}</span>
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
