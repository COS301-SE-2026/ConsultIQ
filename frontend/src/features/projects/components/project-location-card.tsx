import { Card } from "../../../components/ui/card";
import type { ProjectFormData } from "../pages/project-specification-page";

interface ProjectLocationCardProps {
  data: ProjectFormData;
  onChange: (field: keyof ProjectFormData, value: any) => void;
}

export default function ProjectLocationCard({ data, onChange }: ProjectLocationCardProps) {
  return (
    <Card className="p-12 h-full w-full flex items-start justify-center">
      <div className="w-full max-w-[440px] flex flex-col h-full">
        <div className="h-6" />

        <h2 className="text-3xl font-bold mb-8" style={{ color: "var(--color-primary)" }}>
          Location
        </h2>

        <div className="h-6" />

        <div className="flex flex-col gap-6 flex-1">
          <div className="flex flex-col gap-3">
            <label htmlFor="addressLine1" className="text-base font-semibold">
              Address line 1
            </label>

            <input
              id="addressLine1"
              type="text"
              value={data.addressLine1}
              onChange={(e) => onChange("addressLine1", e.target.value)}
              className="h-14 rounded border px-4 outline-none"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="addressLine2" className="text-base font-semibold">
              Address line 2
            </label>

            <input
              id="addressLine2"
              type="text"
              value={data.addressLine2}
              onChange={(e) => onChange("addressLine2", e.target.value)}
              className="h-14 rounded border px-4 outline-none"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="suburb" className="text-base font-semibold">
              Suburb
            </label>

            <input
              id="suburb"
              type="text"
              value={data.suburb}
              onChange={(e) => onChange("suburb", e.target.value)}
              className="h-14 rounded border px-4 outline-none"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="city" className="text-base font-semibold">
              City
            </label>

            <input
              id="city"
              type="text"
              value={data.city}
              onChange={(e) => onChange("city", e.target.value)}
              className="h-14 rounded border px-4 outline-none"
            />
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="province" className="text-base font-semibold">
              Province
            </label>

            <select
              id="province"
              value={data.province}
              onChange={(e) => onChange("province", e.target.value)}
              className="h-14 rounded border px-4 outline-none"
            >

              <option value="">Select a province</option>
              <option value="Gauteng">Gauteng</option>
              <option value="KwaZulu-Natal">KwaZulu-Natal</option>
              <option value="Western Cape">Western Cape</option>
              <option value="Eastern Cape">Eastern Cape</option>
              <option value="Limpopo">Limpopo</option>
              <option value="Mpumalanga">Mpumalanga</option>
              <option value="Northern Cape">Northern Cape</option>
              <option value="Free State">Free State</option>
            </select>
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="postalCode" className="text-base font-semibold">
              Postal Code
            </label>

            <input
              id="postalCode"
              type="text"
              value={data.postalCode}
              onChange={(e) => onChange("postalCode", e.target.value)}
              className="h-14 rounded border px-4 outline-none"
            />
          </div>
        </div>

        <div className="h-6" />
      </div>
    </Card>
  );
}