export type UUIDBaseVersion = "v1" | "v4" | "v6" | "v7";
export type UUIDv35Version = "v3" | "v5";
export type UUIDVersion = UUIDBaseVersion | UUIDv35Version;

export type UUIDCase = "lower" | "upper";
export type UUIDMultiCursorBehavior = "unique" | "repeat";

export const defaultFormat = "xxxx-xx-xx-xx-xxxxxx";
