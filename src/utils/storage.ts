import { Tanker, Driver, LorryReceipt, Trip, MaintenanceBill, TankerExpense, SystemEvent } from '../types';

// Let's seed initial data for petro-chemical tanker operational records.
// The current local date is 2026-05-23.

const INITIAL_TANKERS: Tanker[] = [];

const INITIAL_DRIVERS: Driver[] = [];

const INITIAL_LORRY_RECEIPTS: LorryReceipt[] = [];

const INITIAL_TRIPS: Trip[] = [];

const INITIAL_MAINTENANCE_BILLS: MaintenanceBill[] = [];

const INITIAL_EXPENSES: TankerExpense[] = [];


// Persistent Store Handler
export class FleetMasterStore {
  static getCurrentUsername(): string | null {
    const session = localStorage.getItem('fleetmaster_session');
    if (!session) return null;
    try {
      const user = JSON.parse(session);
      return user?.username || null;
    } catch {
      return null;
    }
  }

  static get(key: string, defaultValue: any) {
    if (key === 'users') {
      const item = localStorage.getItem('fleetmaster_users');
      return item ? JSON.parse(item) : defaultValue;
    }
    const username = this.getCurrentUsername();
    if (!username) {
      // Fallback if no user is authenticated yet
      const item = localStorage.getItem(`fleetmaster_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    }
    const item = localStorage.getItem(`fleetmaster_${username}_${key}`);
    return item ? JSON.parse(item) : defaultValue;
  }

  static set(key: string, value: any) {
    if (key === 'users') {
      localStorage.setItem('fleetmaster_users', JSON.stringify(value));
      return;
    }
    const username = this.getCurrentUsername();
    if (!username) {
      localStorage.setItem(`fleetmaster_${key}`, JSON.stringify(value));
      return;
    }
    localStorage.setItem(`fleetmaster_${username}_${key}`, JSON.stringify(value));
  }

  static initializeAll() {
    // Zero pre-registered users. All users must register a clean account.
    if (!localStorage.getItem('fleetmaster_clean_installed_v5')) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('fleetmaster_') || key === 'fleetmaster_session')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem('fleetmaster_users', JSON.stringify([]));
      localStorage.setItem('fleetmaster_clean_installed_v5', 'true');
    }
  }

  static getEvents(): SystemEvent[] {
    const username = this.getCurrentUsername();
    const key = username ? `fleetmaster_${username}_system_events` : 'fleetmaster_system_events';
    const item = localStorage.getItem(key);
    if (item) return JSON.parse(item);

    const defaults: SystemEvent[] = [];
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  }

  static addEvent(title: string, detail: string, type: 'trip' | 'invoice' | 'fuel' | 'maintenance' | 'accounting' | 'general') {
    const list = this.getEvents();
    const newEvent: SystemEvent = {
      id: 'evt-' + Date.now(),
      title,
      detail,
      timestamp: new Date().toISOString(),
      type
    };
    const updated = [newEvent, ...list].slice(0, 30);
    const username = this.getCurrentUsername();
    const key = username ? `fleetmaster_${username}_system_events` : 'fleetmaster_system_events';
    localStorage.setItem(key, JSON.stringify(updated));

    window.dispatchEvent(new CustomEvent('fleetmaster_event_logged', { detail: newEvent }));
  }

  static purge() {
    const username = this.getCurrentUsername();
    if (username) {
      localStorage.removeItem(`fleetmaster_${username}_tankers`);
      localStorage.removeItem(`fleetmaster_${username}_drivers`);
      localStorage.removeItem(`fleetmaster_${username}_lrs`);
      localStorage.removeItem(`fleetmaster_${username}_trips`);
      localStorage.removeItem(`fleetmaster_${username}_bills`);
      localStorage.removeItem(`fleetmaster_${username}_expenses`);
      localStorage.removeItem(`fleetmaster_${username}_system_events`);
    } else {
      localStorage.removeItem('fleetmaster_tankers');
      localStorage.removeItem('fleetmaster_drivers');
      localStorage.removeItem('fleetmaster_lrs');
      localStorage.removeItem('fleetmaster_trips');
      localStorage.removeItem('fleetmaster_bills');
      localStorage.removeItem('fleetmaster_expenses');
      localStorage.removeItem('fleetmaster_system_events');
    }
    localStorage.removeItem('fleetmaster_users');
    localStorage.removeItem('fleetmaster_session');
    this.initializeAll();
    window.location.reload();
  }
}
