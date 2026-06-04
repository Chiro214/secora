import puppeteer from 'puppeteer';
import { logger } from '../utils/logger.js';

/**
 * Replays a recorded authentication macro using Puppeteer
 * @param {Array} steps The array of recorded macro steps
 * @returns {Object} Extracted session cookies and storage
 */
export async function replayMacro(steps) {
    if (!steps || steps.length === 0) {
        throw new Error('Macro contains no steps');
    }

    logger.info(`Replaying macro with ${steps.length} steps...`);
    
    // Launch headless browser
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Stealth settings
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9'
    });

    try {
        // Execute steps sequentially
        for (let i = 0; i < steps.length; i++) {
            const step = steps[i];
            logger.info(`Executing macro step ${i+1}: ${step.action} ${step.url || step.selector || ''}`);

            if (step.action === 'goto') {
                await page.goto(step.url, { waitUntil: 'networkidle2', timeout: 30000 });
            } 
            else if (step.action === 'waitForNavigation') {
                try {
                    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
                } catch (e) {
                    logger.warn(`Timeout waiting for navigation on step ${i+1}`);
                }
            } 
            else if (step.action === 'click') {
                try {
                    await page.waitForSelector(step.selector, { visible: true, timeout: 5000 });
                    await page.click(step.selector);
                } catch (e) {
                    logger.error(`Failed to click selector ${step.selector}`);
                    throw e;
                }
            } 
            else if (step.action === 'type') {
                try {
                    await page.waitForSelector(step.selector, { visible: true, timeout: 5000 });
                    // Clear existing value first
                    await page.click(step.selector, { clickCount: 3 });
                    await page.keyboard.press('Backspace');
                    await page.type(step.selector, step.value, { delay: 50 });
                } catch (e) {
                    logger.error(`Failed to type into selector ${step.selector}`);
                    throw e;
                }
            }
            
            // Add a small delay between actions to mimic human behavior
            await new Promise(r => setTimeout(r, 500));
        }

        logger.info('Macro execution finished. Extracting session data...');
        
        // Wait a moment for final auth redirects to settle
        await new Promise(r => setTimeout(r, 2000));

        // 1. Extract Cookies
        const cookies = await page.cookies();
        
        // 2. Extract LocalStorage / SessionStorage
        const storage = await page.evaluate(() => {
            const ls = {};
            const ss = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                ls[key] = localStorage.getItem(key);
            }
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                ss[key] = sessionStorage.getItem(key);
            }
            return { localStorage: ls, sessionStorage: ss };
        });

        const sessionData = {
            cookies,
            storage,
            timestamp: Date.now()
        };

        return sessionData;

    } catch (err) {
        logger.error(`Macro execution failed: ${err.message}`);
        throw err;
    } finally {
        await browser.close();
    }
}

/**
 * Utility to convert sessionData into an Axios headers object
 */
export function buildHeadersFromSession(sessionData) {
    const headers = {};
    
    if (sessionData && sessionData.cookies && sessionData.cookies.length > 0) {
        headers['Cookie'] = sessionData.cookies.map(c => `${c.name}=${c.value}`).join('; ');
    }

    if (sessionData && sessionData.storage) {
        // Attempt to find common JWT tokens in local storage
        const ls = sessionData.storage.localStorage || {};
        for (const [key, value] of Object.entries(ls)) {
            const k = key.toLowerCase();
            if (k.includes('token') || k.includes('jwt') || k.includes('auth')) {
                // If it looks like a bearer token
                if (typeof value === 'string' && value.split('.').length === 3) {
                    headers['Authorization'] = `Bearer ${value.replace(/"/g, '')}`;
                    break;
                }
            }
        }
    }

    return headers;
}

/**
 * Sets up an axios interceptor to automatically refresh the session
 * using the macro engine when a 401/403 is encountered.
 */
import axios from 'axios';

export function setupAuthInterceptor(macroId, currentAccountsObj) {
    if (!macroId) return null;

    logger.info(`Setting up Macro Auto-Refresh Interceptor for Macro ${macroId}`);

    const interceptorId = axios.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;
            
            // If we get a 401/403 and haven't already retried this request
            if (error.response && [401, 403].includes(error.response.status) && !originalRequest._retry) {
                originalRequest._retry = true;
                logger.warn(`Auth expired (401/403) detected on ${originalRequest.url}. Triggering Macro Replay...`);
                
                try {
                    // Fetch macro from DB
                    const { PrismaClient } = await import('@prisma/client');
                    const prisma = new PrismaClient();
                    const macro = await prisma.macro.findUnique({ where: { id: macroId } });
                    
                    if (macro && macro.steps) {
                        // Replay it
                        const sessionData = await replayMacro(macro.steps);
                        
                        // Save new session data to DB
                        await prisma.macro.update({
                            where: { id: macroId },
                            data: { sessionData }
                        });
                        
                        // Extract headers
                        const newHeaders = buildHeadersFromSession(sessionData);
                        
                        // Update the current scanning accounts object so subsequent requests use it
                        if (currentAccountsObj) {
                            if (!currentAccountsObj.headers) currentAccountsObj.headers = {};
                            Object.assign(currentAccountsObj.headers, newHeaders);
                        }

                        // Update this specific request
                        Object.assign(originalRequest.headers, newHeaders);
                        
                        // Retry the request
                        return axios(originalRequest);
                    }
                } catch (replayErr) {
                    logger.error(`Macro replay failed during auto-refresh: ${replayErr.message}`);
                }
            }
            return Promise.reject(error);
        }
    );

    // Return a cleanup function
    return () => {
        axios.interceptors.response.eject(interceptorId);
    };
}
