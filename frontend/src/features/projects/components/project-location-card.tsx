import { Card } from "../../../components/ui/card";

function ProjectLocationCard() {
return (
    <Card className="p-12 h-full w-full flex items-start justify-center">
      <div className="w-full max-w-[440px] flex flex-col h-full">
        <div className="h-6" />

      <h2
        className="text-3xl font-bold mb-8"
        style={{
          color: "var(--color-primary)",
        }}>
        Location
      </h2>
        <div className="h-6" />

      <div className="flex flex-col gap-6 flex-1">
        <div className="flex flex-col gap-3">
          <label htmlFor="address1"
          className="text-base font-semibold">
            Address line 1
          </label>
      
          <input
            id="address1"
            type="text"
            className="h-14 rounded border px-4 outline-none"
          />
        </div>

        <div className="flex flex-col gap-3">
          <label htmlFor="address2"
           className="text-base font-semibold">
            Address line 2
          </label>

          <input
            id="address2"
            type="text"
            className="h-14 rounded border px-4 outline-none"
          />
        </div>

        <div className="flex flex-col gap-3">
          <label htmlFor="suburb"
           className="text-base font-semibold">
            Suburb
          </label>

          <input
            id="suburb"
            type="text"
            className="h-14 rounded border px-4 outline-none"
          />
        </div>

        <div className="flex flex-col gap-3">
          <label htmlFor="city"
           className="text-base font-semibold">
            City
          </label>

          <input
            id="city"
            type="text"
            className="h-14 rounded border px-4 outline-none"
          />
        </div>

        <div className="flex flex-col gap-3">
          <label 
            htmlFor="province"
            className="text-base font-semibold">
            Province
          </label>

          <select
            id="province"
            className="h-14 rounded border px-4 outline-none"
            defaultValue="">

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
          <label htmlFor="postalCode"
            className="text-base font-semibold">
            Postal Code
          </label>

          <input
            id="postalCode"
            type="text"
            className="h-14 rounded border px-4 outline-none"
          />
        </div>
         {/* Done Button */}
        <div className="mt-auto flex justify-end">
            <button className=" h-16 w-48 text-lg rounded font-semibold transition bg-gray-50 hover:bg-gray-100"
              style={{
                color:
                  "var(--color-primary)",
              }}
            onClick={() => console.log("Skills saved")}
          >
            Done
          </button>
        </div>

        <div className="h-6" />
      </div>
      </div>
    </Card>
  );
}

export default ProjectLocationCard;