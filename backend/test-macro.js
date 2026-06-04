import { PrismaClient } from '@prisma/client';
import express from 'express';
import { replayMacro, buildHeadersFromSession } from './src/engines/macroEngine.js';

const prisma = new PrismaClient();

async function main() {
    console.log('🧪 Testing Macro Authentication Engine...');

    // 1. Setup Mock Target App Server
    const app = express();
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    // Mock routes
    app.get('/login', (req, res) => {
        res.send(`
            <html>
                <body>
                    <form method="POST" action="/login">
                        <input id="email" name="email" type="text" />
                        <input id="password" name="password" type="password" />
                        <button id="submit" type="submit">Login</button>
                    </form>
                </body>
            </html>
        `);
    });

    app.post('/login', (req, res) => {
        if (req.body.email === 'admin@corp.com' && req.body.password === 'secret123') {
            res.cookie('session_id', 'authenticated_token_abc123', { httpOnly: true });
            res.redirect('/dashboard');
        } else {
            res.status(401).send('Unauthorized');
        }
    });

    app.get('/dashboard', (req, res) => {
        res.send('Welcome to the Dashboard!');
    });

    const server = app.listen(9999, async () => {
        console.log('Mock target running on port 9999');

        const steps = [
            { action: 'goto', url: 'http://localhost:9999/login' },
            { action: 'type', selector: '#email', value: 'admin@corp.com' },
            { action: 'type', selector: '#password', value: 'secret123' },
            { action: 'click', selector: '#submit' },
            { action: 'waitForNavigation' }
        ];

        console.log('Running Puppeteer macro replay...');
        
        try {
            const sessionData = await replayMacro(steps);
            console.log('✅ Session Data Extracted!');
            
            const headers = buildHeadersFromSession(sessionData);
            console.log('Generated Headers:', headers);

            if (headers['Cookie'] && headers['Cookie'].includes('session_id=authenticated_token_abc123')) {
                console.log('SUCCESS: Puppeteer successfully authenticated and extracted the session cookie!');
                process.exit(0);
            } else {
                console.error('FAILED: Did not extract the correct session cookie.');
                process.exit(1);
            }
        } catch (err) {
            console.error('FAILED during macro execution:', err);
            process.exit(1);
        }
    });
}

main().catch(console.error);
