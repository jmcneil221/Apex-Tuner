type SetupValue = string | number | boolean | null | undefined;
type SetupObject = Record<string, unknown>;

function pick(obj: SetupObject | undefined, path: string): SetupValue {
  if (!obj) return undefined;
  const segments = path.split(".");
  let cursor: unknown = obj;
  for (const key of segments) {
    if (cursor && typeof cursor === "object" && key in (cursor as SetupObject)) {
      cursor = (cursor as SetupObject)[key];
    } else {
      return undefined;
    }
  }
  if (cursor === null || cursor === undefined) return undefined;
  if (
    typeof cursor === "string" ||
    typeof cursor === "number" ||
    typeof cursor === "boolean"
  ) {
    return cursor;
  }
  return undefined;
}

function fmt(value: SetupValue, suffix?: string): string {
  if (value === undefined || value === null || value === "") return "—";
  const text =
    typeof value === "number" && !Number.isInteger(value)
      ? value.toFixed(2)
      : String(value);
  return suffix ? `${text} ${suffix}` : text;
}

function fmtSigned(value: SetupValue, suffix?: string): string {
  if (typeof value !== "number") return fmt(value, suffix);
  const sign = value > 0 ? "+" : "";
  const text = Number.isInteger(value)
    ? `${sign}${value}`
    : `${sign}${value.toFixed(2)}`;
  return suffix ? `${text} ${suffix}` : text;
}

function fmtBrakeBalance(value: SetupValue): string {
  if (typeof value !== "number") return fmt(value);
  if (value === 0) return "0 (neutral)";
  const direction = value < 0 ? "Front" : "Rear";
  return `${direction} ${Math.abs(value)}`;
}

function anyDefined(...values: SetupValue[]): boolean {
  return values.some((v) => v !== undefined && v !== null && v !== "");
}

export function SetupSheet({ setup }: { setup: unknown }) {
  const data: SetupObject =
    setup && typeof setup === "object" && !Array.isArray(setup)
      ? (setup as SetupObject)
      : {};

  const tireF = pick(data, "tires.front");
  const tireR = pick(data, "tires.rear");
  const brakeBalance = pick(data, "brake_balance");

  const dfF = pick(data, "downforce.front");
  const dfR = pick(data, "downforce.rear");
  const ballast = pick(data, "ballast_kg");
  const restrictor = pick(data, "power_restrictor_pct");

  const susp: Array<[string, string, string?]> = [
    ["Ride height",   "ride_height_mm",     "mm"],
    ["Spring rate",   "spring_rate_kgf_mm", "kgf/mm"],
    ["Compression",   "compression"],
    ["Extension",     "extension"],
    ["Anti-roll bar", "anti_roll_bar"],
    ["Camber",        "camber_deg",         "°"],
    ["Toe",           "toe_deg",            "°"],
  ];
  const suspRows = susp
    .map(([label, key, suffix]) => ({
      label,
      front: pick(data, `${key}.front`),
      rear: pick(data, `${key}.rear`),
      suffix,
    }))
    .filter((row) => anyDefined(row.front, row.rear));

  const diffInitial = pick(data, "differential.initial");
  const diffAccel = pick(data, "differential.accel");
  const diffDecel = pick(data, "differential.decel");
  const finalDrive = pick(data, "transmission.final_drive");
  const maxSpeed = pick(data, "transmission.max_speed_kph");
  const fuelMap = pick(data, "fuel_map");

  const showTires = anyDefined(tireF, tireR, brakeBalance);
  const showAero = anyDefined(dfF, dfR, ballast, restrictor);
  const showSusp = suspRows.length > 0;
  const showDrive = anyDefined(
    diffInitial,
    diffAccel,
    diffDecel,
    finalDrive,
    maxSpeed,
    fuelMap,
  );

  if (!showTires && !showAero && !showSusp && !showDrive) {
    return (
      <div className="rounded-xl border border-dashed border-carbon-800 bg-carbon-900/30 p-8 text-center text-sm text-carbon-400">
        This tune has no structured setup data.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {showTires ? (
        <Section title="Tires &amp; Brakes">
          <Row label="Front tires" value={fmt(tireF)} />
          <Row label="Rear tires" value={fmt(tireR)} />
          <Row label="Brake balance" value={fmtBrakeBalance(brakeBalance)} />
        </Section>
      ) : null}

      {showAero ? (
        <Section title="Aero &amp; Body">
          <Row label="Front downforce" value={fmt(dfF)} />
          <Row label="Rear downforce" value={fmt(dfR)} />
          <Row label="Ballast" value={fmt(ballast, "kg")} />
          <Row
            label="Power restrictor"
            value={fmt(restrictor, restrictor === undefined ? undefined : "%")}
          />
        </Section>
      ) : null}

      {showSusp ? (
        <Section title="Suspension" wide>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-carbon-800 text-[10px] uppercase tracking-[0.2em] text-carbon-500">
                <th className="py-2 text-left font-medium"></th>
                <th className="py-2 text-right font-medium">Front</th>
                <th className="py-2 text-right font-medium">Rear</th>
              </tr>
            </thead>
            <tbody>
              {suspRows.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-carbon-900/80 last:border-0"
                >
                  <td className="py-2 text-carbon-300">{row.label}</td>
                  <td className="py-2 text-right font-mono text-carbon-50">
                    {row.label === "Camber" || row.label === "Toe"
                      ? fmtSigned(row.front, row.suffix)
                      : fmt(row.front, row.suffix)}
                  </td>
                  <td className="py-2 text-right font-mono text-carbon-50">
                    {row.label === "Camber" || row.label === "Toe"
                      ? fmtSigned(row.rear, row.suffix)
                      : fmt(row.rear, row.suffix)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ) : null}

      {showDrive ? (
        <Section title="Drivetrain">
          <Row label="LSD initial" value={fmt(diffInitial)} />
          <Row label="LSD accel" value={fmt(diffAccel)} />
          <Row label="LSD decel" value={fmt(diffDecel)} />
          <Row label="Final drive" value={fmt(finalDrive)} />
          <Row label="Max speed" value={fmt(maxSpeed, "km/h")} />
          <Row label="Fuel map" value={fmt(fuelMap)} />
        </Section>
      ) : null}
    </div>
  );
}

function Section({
  title,
  children,
  wide = false,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <section
      className={[
        "rounded-xl border border-carbon-800 bg-carbon-900/40 p-5",
        wide ? "md:col-span-2" : "",
      ].join(" ")}
    >
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.25em] text-apex-300">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-carbon-900/80 py-2 last:border-0">
      <span className="text-sm text-carbon-300">{label}</span>
      <span className="font-mono text-sm text-carbon-50">{value}</span>
    </div>
  );
}
