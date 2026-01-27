import { stringify } from "uuid";
import { UUIDCase } from "./models";

export function formatValue(value: Uint8Array, format: string, uuidCase: UUIDCase) {
  let escape = false;
  let ret = "";

  // TODO: remove when adding support for more format specifiers
  const valueString = stringify(value).replaceAll("-", "");

  const flen = format.length;
  const vlen = valueString.length;
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
          ret += valueString[j++];
          ret += valueString[j++];
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
