import { Card } from "../../../components/ui/card";
import type { ProjectFormData } from "../pages/project-specification-page";

interface ProjectLocationCardProps {
  data: ProjectFormData;
  errors?: Partial<Record<keyof ProjectFormData, string>>;
  readonly onChange: (field: keyof ProjectFormData, value: ProjectFormData[keyof ProjectFormData]) => void;
}

export default function ProjectLocationCard({ data, errors = {}, onChange }: ProjectLocationCardProps) {

  // Helper to apply red borders when there is an error
  const getInputClass = (fieldName: keyof ProjectFormData) =>
    `h-14 rounded border px-4 outline-none transition-colors ${errors[fieldName] ? "border-red-500 focus:border-red-600" : "focus:border-[var(--color-primary)]"
    }`;

  return (
    <Card className="p-12 h-full w-full flex items-start justify-center">
      <div className="w-full max-w-[440px] flex flex-col h-full">
        <div className="h-6" />

        <h2 className="text-3xl font-bold mb-8" style={{ color: "var(--color-primary)" }}>
          Location
        </h2>

        <div className="h-6" />

        <div className="flex flex-col gap-6 flex-1">
          {/* Address Line 1 (Required) */}
          <div className="flex flex-col gap-2">
            <label htmlFor="addressLine1" className="text-base font-semibold">
              Address line 1 <span className="text-red-500">*</span>
            </label>
            <input
              id="addressLine1"
              type="text"
              placeholder="Street address"
              value={data.addressLine1 || ""}
              maxLength={100}
              onChange={(e) => onChange("addressLine1", e.target.value)}
              className={getInputClass("addressLine1")}
            />
            {errors.addressLine1 && <span className="text-sm text-red-500">{errors.addressLine1}</span>}
          </div>

          {/* Address Line 2 (Optional) */}
          <div className="flex flex-col gap-2">
            <label htmlFor="addressLine2" className="text-base font-semibold">
              Address line 2
            </label>
            <input
              id="addressLine2"
              type="text"
              placeholder="Apartment, suite, etc."
              value={data.addressLine2 || ""}
              maxLength={100}
              onChange={(e) => onChange("addressLine2", e.target.value)}
              className={getInputClass("addressLine2")}
            />
          </div>

          {/* Suburb (Optional) */}
          <div className="flex flex-col gap-2">
            <label htmlFor="suburb" className="text-base font-semibold">
              Suburb
            </label>
            <input
              id="suburb"
              type="text"
              placeholder="e.g. Hatfield"
              value={data.suburb || ""}
              maxLength={50}
              onChange={(e) => onChange("suburb", e.target.value)}
              className={getInputClass("suburb")}
            />
          </div>

          {/* City (Required, no numbers allowed) */}
          <div className="flex flex-col gap-2">
            <label htmlFor="city" className="text-base font-semibold">
              City <span className="text-red-500">*</span>
            </label>
            <input
              id="city"
              type="text"
              placeholder="e.g. Pretoria"
              value={data.city || ""}
              maxLength={50}
              onChange={(e) => {
                // Strips out numbers so the user can only type letters, spaces, and hyphens
                const sanitized = e.target.value.replace(/[0-9]/g, "");
                onChange("city", sanitized);
              }}
              className={getInputClass("city")}
            />
            {errors.city && <span className="text-sm text-red-500">{errors.city}</span>}
          </div>

          {/* Province (Required Dropdown) */}
          <div className="flex flex-col gap-2">
            <label htmlFor="province" className="text-base font-semibold">
              Province <span className="text-red-500">*</span>
            </label>
            <select
              id="province"
              value={data.province || ""}
              onChange={(e) => onChange("province", e.target.value)}
              className={getInputClass("province")}
            >
              <option value="" disabled>Select a province</option>
              <option value="Gauteng">Gauteng</option>
              <option value="KwaZulu-Natal">KwaZulu-Natal</option>
              <option value="Western Cape">Western Cape</option>
              <option value="Eastern Cape">Eastern Cape</option>
              <option value="Limpopo">Limpopo</option>
              <option value="Mpumalanga">Mpumalanga</option>
              <option value="Northern Cape">Northern Cape</option>
              <option value="North West">North West</option>
              <option value="Free State">Free State</option>
            </select>
            {errors.province && <span className="text-sm text-red-500">{errors.province}</span>}
          </div>

          {/* Postal Code (Required, strict 4-digit numbers only) */}
          <div className="flex flex-col gap-2">
            <label htmlFor="postalCode" className="text-base font-semibold">
              Postal Code <span className="text-red-500">*</span>
            </label>
            <input
              id="postalCode"
              type="text"
              inputMode="numeric"
              placeholder="e.g. 0083"
              maxLength={4} // Enforces SA 4-digit postal code length
              value={data.postalCode || ""}
              onChange={(e) => {
                // Strips out anything that is not a digit (0-9)
                const sanitized = e.target.value.replace(/\D/g, "");
                onChange("postalCode", sanitized);
              }}
              className={getInputClass("postalCode")}
            />
            {errors.postalCode && <span className="text-sm text-red-500">{errors.postalCode}</span>}
          </div>
        </div>

        <div className="h-6" />
      </div>
    </Card>
  );
}