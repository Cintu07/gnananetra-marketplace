import type { Metadata } from "next";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema as s } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { deleteAddress } from "@/app/(shop)/actions";
import AddressForm from "@/components/shop/AddressForm";

export const metadata: Metadata = { title: "Addresses", robots: { index: false } };

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const list = await db.select().from(s.addresses).where(eq(s.addresses.userId, user.id)).orderBy(desc(s.addresses.isDefault), asc(s.addresses.id));
  return (
    <div className="space-y-5">
      {list.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((a) => (
            <li key={a.id} className="card flex flex-col p-5 text-[14px]">
              <p className="flex items-center gap-2 font-bold">
                {a.name}
                {a.isDefault && <span className="chip bg-brand-50 text-brand-800">Default</span>}
              </p>
              <p className="mt-1 leading-relaxed text-muted">
                {a.company && (
                  <>
                    {a.company}
                    <br />
                  </>
                )}
                {a.line1}
                {a.line2 && `, ${a.line2}`}
                <br />
                {a.city}, {a.state} {a.pincode}
                <br />
                {a.phone}
              </p>
              {a.gstin && <p className="mt-1 font-mono text-[12.5px]">GSTIN {a.gstin}</p>}
              <div className="mt-auto flex gap-2 pt-4">
                <AddressForm address={a} />
                <form action={deleteAddress}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="btn-ghost btn-sm text-danger">Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
      <AddressForm />
    </div>
  );
}
