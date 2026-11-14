// One import per language; each file is typed `Strings`, so a missing or extra key fails the type check.
import type { Strings } from './en';
import { en } from './en';
import { ko } from './ko';
import { vi } from './vi';
import { zh } from './zh';
import { ja } from './ja';
import { ne } from './ne';
import { th } from './th';
import { uz } from './uz';
import { ru } from './ru';
import { mn } from './mn';
import { km } from './km';
import { id } from './id';
import { fil } from './fil';
import { my } from './my';
import { si } from './si';
import { bn } from './bn';
import { hi } from './hi';
import { ur } from './ur';
import { kk } from './kk';
import { ky } from './ky';

export const catalogs: Record<string, Strings> = { en, ko, vi, zh, ja, ne, th, uz, ru, mn, km, id, fil, my, si, bn, hi, ur, kk, ky };
