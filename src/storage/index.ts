import { openDB, IDBPDatabase } from 'idb';
import { Profile } from '../core/bazi/chart';
import { DEFAULT_ZI_CONVENTION, ZiHourConvention } from '../core/ganzhi/hour-pillar';
import { IChingCastResult } from '../core/iching/cast';
import { DEFAULT_TZ_OFFSET_MINUTES } from '../core/time/tz';
import { EventGroup } from '../core/types';

export const CURRENT_BACKUP_SCHEMA_VERSION = 1;

export interface AppSettings {
  ziHourConvention: ZiHourConvention;
  tzOffsetMinutes: number;
  showHanChars: boolean;
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'normal' | 'large';
  enableFlyingStars: boolean;
  enableQimen: boolean;
  compassUseDeviceOrientation: boolean;
  activeProfileId: string | null;
  onboardingCompleted: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  ziHourConvention: DEFAULT_ZI_CONVENTION,
  tzOffsetMinutes: DEFAULT_TZ_OFFSET_MINUTES,
  showHanChars: true,
  theme: 'light',
  fontSize: 'normal',
  enableFlyingStars: true,
  enableQimen: true,
  compassUseDeviceOrientation: false,
  activeProfileId: null,
  onboardingCompleted: false,
};

export interface JournalEntry {
  /** Khóa duy nhất: `${dateISO}:${profileId || 'no_profile'}` */
  id: string;
  dateISO: string;
  profileId: string;
  groupRatings: Record<EventGroup, number>; // 1..5
  predictedEventIds: string[];
  occurredEventIds: string[];
  note: string;
  updatedAt: number;
}

export interface DivinationHistoryEntry {
  id: string;
  createdAt: number;
  question: string;
  result: IChingCastResult;
}

export interface BackupPayloadV1 {
  schemaVersion: number;
  exportedAt: number;
  settings: AppSettings;
  profiles: Profile[];
  journals: JournalEntry[];
  divinations: DivinationHistoryEntry[];
}

export interface ProfileRepo {
  getAll(): Promise<Profile[]>;
  getById(id: string): Promise<Profile | undefined>;
  save(profile: Profile): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

export interface JournalRepo {
  getAll(): Promise<JournalEntry[]>;
  getByDateAndProfile(dateISO: string, profileId: string): Promise<JournalEntry | undefined>;
  save(entry: JournalEntry): Promise<void>;
  remove(id: string): Promise<void>;
  clear(): Promise<void>;
}

export interface DivinationRepo {
  getAll(): Promise<DivinationHistoryEntry[]>;
  save(entry: DivinationHistoryEntry): Promise<void>;
  clear(): Promise<void>;
}

export interface SettingsRepo {
  load(): AppSettings;
  save(partial: Partial<AppSettings>): AppSettings;
  reset(): AppSettings;
}

const SETTINGS_LS_KEY = 'thienco_settings_v1';
const DB_NAME = 'thienco_db';
const DB_VERSION = 1;

// Bộ nhớ đệm trong RAM dự phòng khi chạy trong môi trường không có IndexedDB / localStorage (như Node test)
const memProfiles = new Map<string, Profile>();
const memJournals = new Map<string, JournalEntry>();
const memDivinations = new Map<string, DivinationHistoryEntry>();
let memSettings: AppSettings = { ...DEFAULT_APP_SETTINGS };

let dbPromise: Promise<IDBPDatabase | null> | null = null;

function getDb(): Promise<IDBPDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('profiles')) {
          db.createObjectStore('profiles', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('journals')) {
          db.createObjectStore('journals', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('divinations')) {
          db.createObjectStore('divinations', { keyPath: 'id' });
        }
      },
    }).catch(() => null);
  }
  return dbPromise;
}

export const settingsRepo: SettingsRepo = {
  load(): AppSettings {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(SETTINGS_LS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AppSettings>;
          memSettings = { ...DEFAULT_APP_SETTINGS, ...parsed };
        }
      }
    } catch {
      // Bỏ qua lỗi localStorage bị chặn
    }
    return { ...memSettings };
  },
  save(partial: Partial<AppSettings>): AppSettings {
    memSettings = { ...this.load(), ...partial };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SETTINGS_LS_KEY, JSON.stringify(memSettings));
      }
    } catch {
      // Bỏ qua lỗi quota/security
    }
    return { ...memSettings };
  },
  reset(): AppSettings {
    memSettings = { ...DEFAULT_APP_SETTINGS };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(SETTINGS_LS_KEY);
      }
    } catch {
      // ignore
    }
    return { ...memSettings };
  },
};

export const profileRepo: ProfileRepo = {
  async getAll(): Promise<Profile[]> {
    const db = await getDb();
    if (!db) return Array.from(memProfiles.values()).sort((a, b) => a.createdAt - b.createdAt);
    const all = (await db.getAll('profiles')) as Profile[];
    return all.sort((a, b) => a.createdAt - b.createdAt);
  },
  async getById(id: string): Promise<Profile | undefined> {
    const db = await getDb();
    if (!db) return memProfiles.get(id);
    return (await db.get('profiles', id)) as Profile | undefined;
  },
  async save(profile: Profile): Promise<void> {
    memProfiles.set(profile.id, profile);
    const db = await getDb();
    if (db) await db.put('profiles', profile);
  },
  async remove(id: string): Promise<void> {
    memProfiles.delete(id);
    const db = await getDb();
    if (db) await db.delete('profiles', id);
  },
  async clear(): Promise<void> {
    memProfiles.clear();
    const db = await getDb();
    if (db) await db.clear('profiles');
  },
};

export const journalRepo: JournalRepo = {
  async getAll(): Promise<JournalEntry[]> {
    const db = await getDb();
    const list = db
      ? ((await db.getAll('journals')) as JournalEntry[])
      : Array.from(memJournals.values());
    return list.sort((a, b) => b.dateISO.localeCompare(a.dateISO));
  },
  async getByDateAndProfile(dateISO: string, profileId: string): Promise<JournalEntry | undefined> {
    const id = `${dateISO}:${profileId || 'no_profile'}`;
    const db = await getDb();
    if (!db) return memJournals.get(id);
    return (await db.get('journals', id)) as JournalEntry | undefined;
  },
  async save(entry: JournalEntry): Promise<void> {
    memJournals.set(entry.id, entry);
    const db = await getDb();
    if (db) await db.put('journals', entry);
  },
  async remove(id: string): Promise<void> {
    memJournals.delete(id);
    const db = await getDb();
    if (db) await db.delete('journals', id);
  },
  async clear(): Promise<void> {
    memJournals.clear();
    const db = await getDb();
    if (db) await db.clear('journals');
  },
};

export const divinationRepo: DivinationRepo = {
  async getAll(): Promise<DivinationHistoryEntry[]> {
    const db = await getDb();
    const list = db
      ? ((await db.getAll('divinations')) as DivinationHistoryEntry[])
      : Array.from(memDivinations.values());
    return list.sort((a, b) => b.createdAt - a.createdAt);
  },
  async save(entry: DivinationHistoryEntry): Promise<void> {
    memDivinations.set(entry.id, entry);
    const db = await getDb();
    if (db) await db.put('divinations', entry);
  },
  async clear(): Promise<void> {
    memDivinations.clear();
    const db = await getDb();
    if (db) await db.clear('divinations');
  },
};

/**
 * Migrate dữ liệu sao lưu từ schema cũ (v0 hoặc thiếu trường) lên schema hiện tại (v1).
 */
export function migrateBackupPayload(raw: unknown): BackupPayloadV1 {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Dữ liệu sao lưu không hợp lệ (không phải object JSON).');
  }
  const obj = raw as Record<string, unknown>;
  const rawSettings = (obj.settings ?? {}) as Partial<AppSettings>;
  const settings: AppSettings = {
    ...DEFAULT_APP_SETTINGS,
    ...rawSettings,
    ziHourConvention:
      rawSettings.ziHourConvention === 'day_changes_at_00'
        ? 'day_changes_at_00'
        : 'day_changes_at_23',
  };

  const rawProfiles = Array.isArray(obj.profiles) ? obj.profiles : [];
  const profiles: Profile[] = rawProfiles.map((p: Record<string, unknown>, idx) => ({
    id: String(p.id ?? `migrated-profile-${idx}`),
    name: String(p.name ?? `Hồ sơ ${idx + 1}`),
    birth: {
      datetime: String((p.birth as Record<string, unknown>)?.datetime ?? '1990-01-01T12:00'),
      tz: Number((p.birth as Record<string, unknown>)?.tz ?? DEFAULT_TZ_OFFSET_MINUTES),
      calendar:
        (p.birth as Record<string, unknown>)?.calendar === 'lunar' ? 'lunar' : 'solar',
      isLeapMonth: Boolean((p.birth as Record<string, unknown>)?.isLeapMonth),
    },
    birthTimeKnown: p.birthTimeKnown !== undefined ? Boolean(p.birthTimeKnown) : true,
    gender:
      p.gender === 'nam' || p.gender === 'nu' || p.gender === 'khong_neu'
        ? p.gender
        : 'khong_neu',
    createdAt: Number(p.createdAt ?? 0),
    updatedAt: Number(p.updatedAt ?? 0),
  }));

  const rawJournals = Array.isArray(obj.journals) ? obj.journals : [];
  const journals: JournalEntry[] = rawJournals.map((j: Record<string, unknown>) => {
    const dateISO = String(j.dateISO ?? '2026-01-01');
    const profileId = String(j.profileId ?? 'no_profile');
    const gr = (j.groupRatings ?? {}) as Record<string, number>;
    return {
      id: String(j.id ?? `${dateISO}:${profileId}`),
      dateISO,
      profileId,
      groupRatings: {
        nguoi: Number(gr.nguoi ?? 3),
        tien_bac: Number(gr.tien_bac ?? 3),
        cong_viec: Number(gr.cong_viec ?? 3),
        suc_khoe_di_chuyen: Number(gr.suc_khoe_di_chuyen ?? 3),
      },
      predictedEventIds: Array.isArray(j.predictedEventIds)
        ? j.predictedEventIds.map(String)
        : [],
      occurredEventIds: Array.isArray(j.occurredEventIds)
        ? j.occurredEventIds.map(String)
        : [],
      note: String(j.note ?? ''),
      updatedAt: Number(j.updatedAt ?? 0),
    };
  });

  const rawDivinations = Array.isArray(obj.divinations) ? obj.divinations : [];

  return {
    schemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
    exportedAt: Number(obj.exportedAt ?? 0),
    settings,
    profiles,
    journals,
    divinations: rawDivinations as DivinationHistoryEntry[],
  };
}

export async function exportAllData(): Promise<BackupPayloadV1> {
  const [profiles, journals, divinations] = await Promise.all([
    profileRepo.getAll(),
    journalRepo.getAll(),
    divinationRepo.getAll(),
  ]);
  return {
    schemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
    exportedAt: Date.now(),
    settings: settingsRepo.load(),
    profiles,
    journals,
    divinations,
  };
}

export async function importAllData(raw: unknown): Promise<BackupPayloadV1> {
  const migrated = migrateBackupPayload(raw);
  await clearAllData();
  settingsRepo.save(migrated.settings);
  for (const p of migrated.profiles) await profileRepo.save(p);
  for (const j of migrated.journals) await journalRepo.save(j);
  for (const d of migrated.divinations) await divinationRepo.save(d);
  return migrated;
}

export async function clearAllData(): Promise<void> {
  settingsRepo.reset();
  await Promise.all([profileRepo.clear(), journalRepo.clear(), divinationRepo.clear()]);
}

export interface JournalStatsSummary {
  totalDaysLogged: number;
  groupAvgRating: Record<EventGroup, number>;
  totalPredictedEvents: number;
  totalConfirmedEvents: number;
  matchRatePercent: number;
}

/**
 * Tính thống kê đối chiếu Dự đoán vs Thực tế từ Nhật ký (tính tại máy, không tự đổi trọng số engine).
 */
export function computeJournalStats(entries: JournalEntry[]): JournalStatsSummary {
  if (entries.length === 0) {
    return {
      totalDaysLogged: 0,
      groupAvgRating: { nguoi: 0, tien_bac: 0, cong_viec: 0, suc_khoe_di_chuyen: 0 },
      totalPredictedEvents: 0,
      totalConfirmedEvents: 0,
      matchRatePercent: 0,
    };
  }
  const sums: Record<EventGroup, number> = {
    nguoi: 0,
    tien_bac: 0,
    cong_viec: 0,
    suc_khoe_di_chuyen: 0,
  };
  let totalPredicted = 0;
  let totalConfirmed = 0;

  for (const e of entries) {
    sums.nguoi += e.groupRatings.nguoi || 3;
    sums.tien_bac += e.groupRatings.tien_bac || 3;
    sums.cong_viec += e.groupRatings.cong_viec || 3;
    sums.suc_khoe_di_chuyen += e.groupRatings.suc_khoe_di_chuyen || 3;

    const predSet = new Set(e.predictedEventIds);
    totalPredicted += predSet.size;
    for (const occ of e.occurredEventIds) {
      if (predSet.has(occ)) totalConfirmed++;
    }
  }

  const n = entries.length;
  return {
    totalDaysLogged: n,
    groupAvgRating: {
      nguoi: Math.round((sums.nguoi / n) * 10) / 10,
      tien_bac: Math.round((sums.tien_bac / n) * 10) / 10,
      cong_viec: Math.round((sums.cong_viec / n) * 10) / 10,
      suc_khoe_di_chuyen: Math.round((sums.suc_khoe_di_chuyen / n) * 10) / 10,
    },
    totalPredictedEvents: totalPredicted,
    totalConfirmedEvents: totalConfirmed,
    matchRatePercent:
      totalPredicted > 0 ? Math.round((totalConfirmed / totalPredicted) * 100) : 0,
  };
}
