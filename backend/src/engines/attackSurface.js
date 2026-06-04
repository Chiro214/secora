import axios from 'axios';
import { logger } from '../utils/logger.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Queries crt.sh (Certificate Transparency Logs) to discover subdomains for a given domain.
 * @param {string} domain - The root domain to query (e.g., example.com)
 * @returns {Promise<string[]>} - A list of unique subdomains
 */
export async function discoverSubdomains(domain) {
    logger.info(`[AttackSurface] Discovering subdomains for: ${domain} via crt.sh`);
    try {
        // crt.sh can be slow and sometimes times out, use a long timeout
        const resp = await axios.get(`https://crt.sh/?q=%.${domain}&output=json`, {
            timeout: 30000,
            headers: { 'User-Agent': 'SECORA-AttackSurface-Engine/1.0' }
        });

        if (!Array.isArray(resp.data)) {
            logger.warn(`[AttackSurface] Unexpected response format from crt.sh for ${domain}`);
            return [];
        }

        const subdomains = new Set();
        for (const entry of resp.data) {
            // crt.sh sometimes returns multiple domains separated by newlines in name_value
            if (entry.name_value) {
                const names = entry.name_value.split('\n');
                for (let name of names) {
                    name = name.trim().toLowerCase();
                    // Remove wildcard prefixes
                    if (name.startsWith('*.')) {
                        name = name.substring(2);
                    }
                    if (name.endsWith(domain) && name !== domain) {
                        subdomains.add(name);
                    }
                }
            }
        }

        const uniqueSubdomains = Array.from(subdomains);
        logger.info(`[AttackSurface] Found ${uniqueSubdomains.length} subdomains for ${domain}`);
        return uniqueSubdomains;
    } catch (err) {
        logger.error(`[AttackSurface] Failed to discover subdomains for ${domain}: ${err.message}`);
        return [];
    }
}

/**
 * Updates the Target's subdomains array in the database.
 */
export async function updateTargetSubdomains(targetId, domain) {
    const subdomains = await discoverSubdomains(domain);
    if (subdomains.length === 0) return [];

    try {
        const target = await prisma.target.findUnique({ where: { id: targetId } });
        if (!target) return [];

        const existingSet = new Set(target.subdomains || []);
        let newFound = false;

        for (const sub of subdomains) {
            if (!existingSet.has(sub)) {
                existingSet.add(sub);
                newFound = true;
            }
        }

        if (newFound) {
            const updated = Array.from(existingSet);
            await prisma.target.update({
                where: { id: targetId },
                data: { subdomains: updated }
            });
            logger.info(`[AttackSurface] Updated target ${targetId} with new subdomains`);
            return updated;
        }

        return target.subdomains;
    } catch (err) {
        logger.error(`[AttackSurface] DB Error updating target subdomains: ${err.message}`);
        return [];
    }
}
