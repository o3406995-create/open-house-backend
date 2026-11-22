// An id taken from a URL: plain digits, no leading zero. Number() alone would also accept
// "1e2", "0x10" and " 3", which are not ids.
export const POSITIVE_INT_ID_PATTERN = /^[1-9]\d*$/

// The largest value an INT column can hold; anything bigger cannot be a valid id
export const INT_COLUMN_MAX = 2147483647
