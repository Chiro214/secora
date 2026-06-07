// backend/src/config/prisma.js
import { v4 as uuidv4 } from "uuid";

// Mock Prisma for testing when Postgres is down
const db = {
    users: [],
    organizations: [],
    targets: [],
    scans: [],
    findings: [],
    reports: [],
    evidence: []
};

const prisma = {
    organization: {
        findFirst: async ({ where }) => db.organizations.find(o => Object.keys(where).every(k => o[k] === where[k])),
        create: async ({ data }) => { const org = { id: uuidv4(), ...data }; db.organizations.push(org); return org; }
    },
    user: {
        create: async ({ data }) => { const user = { id: uuidv4(), ...data }; db.users.push(user); return user; },
        findUnique: async ({ where }) => db.users.find(u => Object.keys(where).every(k => u[k] === where[k]))
    },
    target: {
        create: async ({ data }) => { const target = { id: uuidv4(), ...data }; db.targets.push(target); return target; },
        findMany: async ({ where }) => db.targets.filter(t => Object.keys(where).every(k => t[k] === where[k])),
        findUnique: async ({ where }) => db.targets.find(t => Object.keys(where).every(k => t[k] === where[k]))
    },
    scan: {
        create: async ({ data }) => { const scan = { id: uuidv4(), ...data }; db.scans.push(scan); return scan; },
        findUnique: async ({ where }) => db.scans.find(s => Object.keys(where).every(k => s[k] === where[k])),
        update: async ({ where, data }) => { 
            const idx = db.scans.findIndex(s => Object.keys(where).every(k => s[k] === where[k]));
            if(idx !== -1) { db.scans[idx] = { ...db.scans[idx], ...data }; return db.scans[idx]; }
            return null;
        }
    },
    finding: {
        create: async ({ data }) => { const finding = { id: uuidv4(), ...data }; db.findings.push(finding); return finding; },
        findMany: async ({ where }) => db.findings.filter(f => Object.keys(where).every(k => f[k] === where[k]))
    },
    asset: {
        create: async ({ data }) => { return { id: uuidv4(), ...data }; }
    },
    report: {
        create: async ({ data }) => { const report = { id: uuidv4(), ...data }; db.reports.push(report); return report; }
    },
    $disconnect: async () => {}
};

export default prisma;
