/**
 * wiremd version constants
 *
 * Lives in its own module so the browser-safe `wiremd/embed` graph can
 * read `SYNTAX_VERSION` without importing the root barrel (which pulls
 * the full renderer set).
 *
 * Copyright (c) 2025 wiremd
 * Licensed under MIT License
 * https://github.com/akonan/wiremd/blob/main/LICENSE
 */

/** Package version — keep in sync with package.json (asserted by test). */
export const VERSION = '0.1.7';

/** Syntax version — the host-side cache/invalidation gauge. */
export const SYNTAX_VERSION = '0.1';
