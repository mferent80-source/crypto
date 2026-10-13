// v100.175: calendarul burselor (public/lib/calendar-bursa.js) pentru modulele colectorului - aceeași sursă ca pagina
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "public", "lib", "calendar-bursa.js");
export const CalendarBursa = new Function(fs.readFileSync(SRC, "utf8") + "; return CalendarBursa;")();
