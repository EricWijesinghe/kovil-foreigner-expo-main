// UI text lives in JSON so the Rust linter (core/kovil-l10n `app-lint`) and the jest catalog test can check it.
// en.json is the source: every other catalog must have exactly its keys and {placeholders}.
// Korean housing words stay recognisable: the Korean term is shown next to the translation.
import bn from './bn.json';
import en from './en.json';
import fil from './fil.json';
import hi from './hi.json';
import id from './id.json';
import ja from './ja.json';
import kk from './kk.json';
import km from './km.json';
import ko from './ko.json';
import ky from './ky.json';
import mn from './mn.json';
import my from './my.json';
import ne from './ne.json';
import ru from './ru.json';
import si from './si.json';
import th from './th.json';
import ur from './ur.json';
import uz from './uz.json';
import vi from './vi.json';
import zh from './zh.json';

export type StringKey = keyof typeof en;
export type Strings = Record<StringKey, string>;
export { en };

// Partial: a missing key falls back to English at runtime; completeness is enforced by tests, not by the type.
export const catalogs: Record<string, Partial<Strings>> = { en, ko, vi, zh, ja, ne, th, uz, ru, mn, km, id, fil, my, si, bn, hi, ur, kk, ky };
