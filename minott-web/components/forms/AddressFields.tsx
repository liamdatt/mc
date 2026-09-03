"use client";

import { PARISHES } from "@/lib/constants";

export type AddressValues = {
  street: string;
  city: string;
  parish: string;
  zip: string;
};

export const EMPTY_ADDRESS: AddressValues = { street: "", city: "", parish: "", zip: "" };

/**
 * Street / City / Parish / Zip inputs named `${prefix}Street` etc. Used by the
 * public New Customer Form and the admin company form, which pass their own
 * input/label classes. A stored parish that is not in PARISHES (legacy data)
 * is kept selectable so an edit does not silently drop it.
 */
export function AddressFields({
  prefix,
  values,
  required,
  inputClass,
  labelClass,
}: {
  prefix: "billing" | "shipping";
  values: AddressValues;
  required: boolean;
  inputClass: string;
  labelClass: string;
}) {
  const star = required ? " *" : "";
  const legacyParish = values.parish && !(PARISHES as readonly string[]).includes(values.parish);
  return (
    <>
      <label className={labelClass}>
        Street{star}
        <input name={`${prefix}Street`} required={required} defaultValue={values.street} className={inputClass} />
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className={labelClass}>
          City{star}
          <input name={`${prefix}City`} required={required} defaultValue={values.city} className={inputClass} />
        </label>
        <label className={labelClass}>
          Parish{star}
          <select name={`${prefix}Parish`} required={required} defaultValue={values.parish} className={inputClass}>
            <option value="">{required ? "Select parish" : "—"}</option>
            {legacyParish && <option value={values.parish}>{values.parish} (legacy)</option>}
            {PARISHES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          Zip code
          <input name={`${prefix}Zip`} defaultValue={values.zip} className={inputClass} />
        </label>
      </div>
    </>
  );
}
