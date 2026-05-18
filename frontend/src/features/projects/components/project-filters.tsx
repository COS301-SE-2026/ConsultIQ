import { ChevronDown, Wallet, Users, MapPin, } from "lucide-react";

interface ProjectFiltersProps {
  readonly budgetFilter: string;
  readonly teamSizeFilter: string;
  readonly locationFilter: string;

  readonly onBudgetChange: (
    value: string
  ) => void;

  readonly onTeamSizeChange: (
    value: string
  ) => void;

  readonly onLocationChange: (
    value: string
  ) => void;
}

export default function ProjectFilters({
  budgetFilter,
  teamSizeFilter,
  locationFilter,
  onBudgetChange,
  onTeamSizeChange,
  onLocationChange,
}: ProjectFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-4 mb-8">
      {/* Budget */}
      <div className="relative w-fit">
        <Wallet className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none" size={22} style={{ color: "var(--color-primary)" }} />
        <select
          value={budgetFilter}
          onChange={(e) =>
            onBudgetChange(e.target.value)
          }
          className="w-full min-w-[220px] max-w-[240px] h-16 rounded-2xl border bg-white pr-12 text-xl font-semibold appearance-none outline-none"
          style={{
            borderColor:
              "var(--color-border)",
            color:
              "var(--color-primary)",
            paddingLeft: "68px",
          }}>
          <option value="" disabled>
            Budget
          </option>

          <option value="small">
            Under R50 000
          </option>

          <option value="medium">
            R50 000 - R200 000
          </option>

          <option value="large">
            Above R200 000
          </option>

          <option value="all">
            All Budgets
          </option>
        </select>

        <ChevronDown
          className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--color-primary)" }}
        />
      </div>

      {/* Team Size */}
      <div className="relative w-fit">
        <Users className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none" size={22} style={{ color: "var(--color-primary)" }} />
        <select
          value={teamSizeFilter}
          onChange={(e) =>
            onTeamSizeChange(e.target.value)
          }
          className="w-full min-w-[220px] max-w-[240px] h-16 rounded-2xl border bg-white pr-12 text-xl font-semibold appearance-none outline-none"
          style={{
            borderColor:
              "var(--color-border)",
            color:
              "var(--color-primary)",
            paddingLeft: "68px",
          }}>
          <option value="" disabled>
            Team Size
          </option>

          <option value="small">
            1 - 5
          </option>

          <option value="medium">
            6 - 10
          </option>

          <option value="large">
            10+
          </option>

          <option value="all">
            All Team Sizes
          </option>
        </select>

        <ChevronDown
          className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--color-primary)" }}
        />
      </div>

      {/* Location */}
      <div className="relative w-fit">
        <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none" size={22} style={{ color: "var(--color-primary)" }} />
        <select
          value={locationFilter}
          onChange={(e) =>
            onLocationChange(e.target.value)
          }
          className="w-full min-w-[220px] max-w-[240px] h-16 rounded-2xl border bg-white pr-12 text-xl font-semibold appearance-none outline-none"
          style={{
            borderColor:
              "var(--color-border)",
            color:
              "var(--color-primary)",
            paddingLeft: "68px",
          }}>
          <option value="" disabled>
            Location
          </option>

          <option value="gauteng">
            Gauteng
          </option>

          <option value="western-cape">
            Western Cape
          </option>

          <option value="kwazulu-natal">
            KwaZulu-Natal
          </option>

          <option value="eastern-cape">
            Eastern Cape
          </option>

          <option value="free-state">
            Free State
          </option>

          <option value="limpopo">
            Limpopo
          </option>

          <option value="mpumalanga">
            Mpumalanga
          </option>

          <option value="northern-cape">
            Northern Cape
          </option>

          <option value="north-west">
            North West
          </option>

          <option value="all">
            All Locations
          </option>
        </select>

        <ChevronDown
          className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--color-primary)" }}
        />
      </div>
    </div>
  );
}