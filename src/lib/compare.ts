/**
 * Numărul maxim de proiecte comparate simultan (CLAUDE.md, pasul 8:
 * „Comparație între 2–3 proiecte").
 *
 * Stă într-un modul obișnuit, nu în componenta client: o constantă
 * exportată dintr-un fișier "use client" ajunge în server components ca
 * proxy de referință, nu ca valoare.
 */
export const MAX_COMPARE = 3;
