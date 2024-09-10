import { whole_to_raw, get_address_from_public_key } from "banani";

export const TRANS_MIN = whole_to_raw("0.0012070301");
export const TRANS_MAX = whole_to_raw("0.00120703011");

export const FREEZE_PUB_KEY = "451" + "1".repeat(61);
export const FREEZE_REP = get_address_from_public_key(FREEZE_PUB_KEY);

