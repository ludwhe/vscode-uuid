import { stringify } from "uuid";
import { UUIDCase } from "./models";

export function formatValue(value: Uint8Array, format: string, uuidCase: UUIDCase) {
  let escape = false;
  let ret = "";

  // TODO: remove when adding support for more format specifiers
  const valueString = stringify(value).replaceAll("-", "");
  const insert = uuidCase === "upper" ? valueString.toUpperCase() : valueString;

  const flen = format.length;
  const vlen = insert.length;
  let i = 0;
  for (let j = 0; i < flen && j < vlen; i++) {
    const c = format[i];

    if (escape) {
      if (c == "x" || c == "o") {
        ret += c;
      } else {
        ret += "\\"
        ret += c
      }

      escape = false;
    } else {
      switch (c) {
        case "\\":
          escape = true;
          continue;
        case "x":
          ret += insert[j++];
          ret += insert[j++];
          continue;
        default:
          ret += c;
      }
    }
  }

  if (i < flen) {
    ret += format.slice(i);
  }

  return ret;
}
