import { SectionCard } from "../../../../components/shared/section-card";
import { DetailField } from "../../../../components/shared/detail-field";
import { Input } from "../../../../components/ui/input";
import { useState } from "react";
import { toast } from "sonner";
import EditControls from "./edit-controls";
import { useAddressSearch } from "../../../../hooks/useAddressSearch";
import SearchBar from "../../../../components/shared/search-bar";

interface LocationCardProps {
  readonly addressLine1: string;
  readonly addressLine2?: string;
  readonly suburb?: string;
  readonly city: string;
  readonly province: string;
  readonly postalCode: string
  readonly canEdit?: boolean;
  readonly onSave?: (updatedLocation: { addressLine1: string; addressLine2?: string; suburb?: string; city: string; province: string, postalCode?: string }) => void;
}


interface LocationForm{
  readonly addressLine1: string;
  readonly addressLine2: string;
  readonly suburb: string;
  readonly city: string;
  readonly province: string;
  readonly postalCode: string
}

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

function FormField({ label,value,onChange,error}: FormFieldProps) {
  return (

    <div>
      <label className="text-sm font-medium " htmlFor="form-address-line-one">{label}</label>
      <Input value={value} onChange={(e) => onChange( e.target.value)} />
      {error && <span className="text-red-500 text-xs mt-1 block">{error}</span>}
    </div>
  );
}


export default function LocationCard({
  addressLine1,
  addressLine2,
  suburb,
  city,
  province,
  postalCode: initialPostalCode,
  canEdit,
  onSave,

}: LocationCardProps) {

  const [isEditing, setIsEditing] = useState(false);
  const [address1Error, setAddress1Error] = useState("");
  const [cityError, setCityError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const createLocation = (): LocationForm => ({
    addressLine1,
    addressLine2: addressLine2 ?? "",
    suburb: suburb ?? "",
    city,
    province,
    postalCode: initialPostalCode ?? "",
  });

  const [location, setLocation] = useState<LocationForm>(createLocation);

  const updateLocation = (field: keyof LocationForm, value: string) => {
    setLocation(prev => ({ ...prev, [field]: value }));
  };

  const resetLocation = () => {
    setLocation(createLocation());
  };

  const handleSave = async () => {
    let isValid = true;
    if (location.addressLine1.trim()) {
      setAddress1Error("");
    } else {
      setAddress1Error("Address line 1 is required");
      isValid = false;
    }

    if (location.city.trim()) {
      setCityError("");
    } else {
      setCityError("city is required");
      isValid = false;
    }

    if (!isValid) return;

    setIsSaving(true);
    try {
      await onSave?.({
        addressLine1: location.addressLine1.trim(),
        addressLine2: location.addressLine2?.trim() || undefined,
        suburb: location.suburb || undefined,
        city: location.city.trim(),
        province: location.province,
        postalCode: location.postalCode.trim() || undefined,
      });
      setIsEditing(false);
      toast.success("Location has been updated successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update — please try again");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    resetLocation();
    setIsEditing(false);

  }

  const handleEditClick = () => {
    resetLocation();
    setIsEditing(true);
  }

  const {
    addressSearch,
    locationResults,
    isAddressLoading,
    showDropdown,
    handleSearchAddress,
    handleSelectAddress,

  } = useAddressSearch({
    onSelect: (parsed) => {
      setLocation({
        addressLine1: parsed.addressLine1 ?? "",
        addressLine2: parsed.addressLine2 ?? "",
        suburb: parsed.suburb ?? "",
        city: parsed.city ?? "",
        province: parsed.province,
        postalCode: (parsed.postalCode ?? "").replace(/\D/g, ""),
      });
    },
  });

  const Field_Map: {key: keyof LocationForm;label:string;error?:string }[]=[
  {key:"addressLine1",label:"Address line 1"},
  {key:"addressLine2",label:"Address line 2"},
  {key:"suburb",label:"Suburb"},
  {key:"city",label:"City"},
  {key:"postalCode",label:"Postal Code"},

];

const fieldErrors:Partial<Record<keyof LocationForm,string>>={
  addressLine1: address1Error,
  city: cityError,
}


  return (
    <div className="relative">

      <SectionCard
        title="Location"
        edit={
          canEdit && (
            <EditControls
              isEditing={isEditing}
              isSaving={isSaving}
              onEdit={handleEditClick}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          )
        }
      >

        {isEditing && (
          <>
            <div className="relative w-full">
              <SearchBar
                value={addressSearch}
                onChange={handleSearchAddress}
                placeholder="Search for an address..."
              />

              {showDropdown && locationResults && (
                <ul className="absolute z-10 w-full bg-white border border-slate-200 rounded-xl mt-1 shadow-lg">
                  <li>
                    <button
                      type="button"
                      className="px-4 py-3 cursor-pointer hover:bg-slate-100 rounded-xl w-full flex justify-start"
                      onClick={handleSelectAddress}
                    >
                      {[locationResults.addressLine1, locationResults.suburb, locationResults.city, locationResults.province, locationResults.postalCode].filter(Boolean).join(", ")}
                    </button>
                  </li>
                </ul>
              )}

            </div>

            {isAddressLoading && (
              <p className="text-sm text-brand-muted animate-pulse">Finding address details...</p>
            )}
          </>

        )}

        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "28px" }}>
          {isEditing ? (

            <>
              {Field_Map.map(({key,label})=>(
                <FormField
                  key={key}
                  label={label}
                  value={location[key]}
                  onChange={(v)=>updateLocation(key,v)}
                  error={fieldErrors[key]}
                />
              ))}

              <div>
                <label className="text-sm font-medium" htmlFor="form-province">Province</label>
                <select
                  id="province"
                  className="flex h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none transition focus:border-[#002D72]"
                  value={location.province}
                  onChange={(e) => { updateLocation("province", e.target.value) }}
                >
                  <option value="" disabled>Select Province</option>
                  <option value="Eastern Cape">Eastern Cape</option>
                  <option value="Free State">Free State</option>
                  <option value="Gauteng">Gauteng</option>
                  <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                  <option value="Limpopo">Limpopo</option>
                  <option value="Mpumalanga">Mpumalanga</option>
                  <option value="North West">North West</option>
                  <option value="Northern Cape">Northern Cape</option>
                  <option value="Western Cape">Western Cape</option>
                </select>
              </div>

            </>
          ) : (
            <>
            {Field_Map.map(({key,label})=>(
              <DetailField
                key={key}
                label={key === "postalCode" ? "Postal code" : label}
                value={location[key] || `${label} not provided`}
                variant="compact"
              />
            ))}
            
              <DetailField label="Province" value={location.province} variant="compact" />
            </>
          )}

        </div>
      </SectionCard>
    </div>

  );
}