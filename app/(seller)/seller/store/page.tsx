import StoreForm from "@/components/seller/StoreForm";
import { requireSeller } from "@/lib/seller-auth";

export const metadata = { title: "My store" };

export default async function MyStore() {
  const { seller } = await requireSeller();
  return (
    <div className="max-w-2xl">
      <p className="eyebrow mb-1.5">Your shop window</p>
      <h1 className="section-title">My store</h1>
      <p className="mt-1 mb-6 text-[14.5px] text-muted">Shoppers see your store name, tagline and about text on your store page and on every product you sell.</p>
      <StoreForm
        initial={{
          storeName: seller.storeName,
          tagline: seller.tagline ?? "",
          about: seller.about ?? "",
          phone: seller.phone ?? "",
          city: seller.city ?? "",
          state: seller.state ?? "",
          gstin: seller.gstin ?? "",
          pickupAddress: seller.pickupAddress ?? "",
        }}
        slug={seller.slug}
        status={seller.status}
      />
    </div>
  );
}
