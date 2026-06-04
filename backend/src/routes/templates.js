import express from 'express';
import prisma from '../config/prisma.js';
import { logger } from '../utils/logger.js';
import yaml from 'js-yaml';
import axios from 'axios';

const router = express.Router();

// Get all custom templates
router.get('/', async (req, res) => {
    try {
        const templates = await prisma.customTemplate.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(templates);
    } catch (err) {
        logger.error(`Error fetching templates: ${err.message}`);
        res.status(500).json({ error: 'Failed to fetch templates' });
    }
});

// Create a new template
router.post('/', async (req, res) => {
    try {
        const { name, severity, target, yamlContent, enabled } = req.body;
        
        // Validate YAML
        try {
            yaml.load(yamlContent);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid YAML format', details: e.message });
        }

        const template = await prisma.customTemplate.create({
            data: {
                name,
                severity,
                target: target || 'URL',
                yamlContent,
                enabled: enabled !== false
            }
        });
        res.status(201).json(template);
    } catch (err) {
        logger.error(`Error creating template: ${err.message}`);
        res.status(500).json({ error: 'Failed to create template' });
    }
});

// Update an existing template
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, severity, target, yamlContent, enabled } = req.body;
        
        if (yamlContent) {
            try {
                yaml.load(yamlContent);
            } catch (e) {
                return res.status(400).json({ error: 'Invalid YAML format', details: e.message });
            }
        }

        const template = await prisma.customTemplate.update({
            where: { id },
            data: {
                name,
                severity,
                target,
                yamlContent,
                enabled
            }
        });
        res.json(template);
    } catch (err) {
        logger.error(`Error updating template: ${err.message}`);
        res.status(500).json({ error: 'Failed to update template' });
    }
});

// Delete a template
router.delete('/:id', async (req, res) => {
    try {
        await prisma.customTemplate.delete({
            where: { id: req.params.id }
        });
        res.status(204).send();
    } catch (err) {
        logger.error(`Error deleting template: ${err.message}`);
        res.status(500).json({ error: 'Failed to delete template' });
    }
});

// Test a template against a URL
import { evaluateCustomTemplates } from '../engines/customRulesEngine.js';

router.post('/test', async (req, res) => {
    try {
        const { url, yamlContent } = req.body;
        if (!url || !yamlContent) {
            return res.status(400).json({ error: 'Missing url or yamlContent' });
        }

        // Validate YAML
        try {
            yaml.load(yamlContent);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid YAML format', details: e.message });
        }

        // To test it without saving, we will create a temporary mock record 
        // But evaluateCustomTemplates expects them in the DB.
        // Let's create a temporary evaluate logic here or refactor.
        // Actually, easiest way is to temporarily save to DB, run test, then delete.
        const tempTemplate = await prisma.customTemplate.create({
            data: {
                name: 'TEST_RUNNER_TEMPLATE',
                severity: 'INFO',
                target: 'URL',
                yamlContent: yamlContent,
                enabled: false // so normal scans don't pick it up
            }
        });

        const endpoint = { url, method: 'GET' };
        let findings = [];
        try {
            // We need to run evaluateCustomTemplates but it only runs enabled templates.
            // We can parse and run it manually for this specific test endpoint.
            const rule = yaml.load(yamlContent);
            const testUrl = new URL(url);
            
            // Replicate logic from customRulesEngine for a single rule
            for (const payload of (rule.payloads || [])) {
                let currentUrl = url;
                let headers = { 'User-Agent': 'SECORA-Custom-Rules-Test' };
                let data = null;

                // For testing purposes, default to URL if not specified in rule.
                // It would be better to extract target from the DB, but this is a quick test.
                // We'll just append it to URL for now.
                const parsedUrl = new URL(currentUrl);
                parsedUrl.pathname = parsedUrl.pathname.endsWith('/') 
                    ? parsedUrl.pathname + payload 
                    : parsedUrl.pathname + '/' + payload;
                currentUrl = parsedUrl.toString();

                let response;
                try {
                    response = await axios({
                        method: 'GET',
                        url: currentUrl,
                        headers: headers,
                        validateStatus: () => true,
                        timeout: 5000
                    });
                } catch (e) { continue; }

                let isMatch = true;
                for (const matcher of (rule.matchers || [])) {
                    let matcherPassed = false;
                    if (matcher.type === 'status') {
                        if (matcher.status.includes(response.status)) matcherPassed = true;
                    } else if (matcher.type === 'word') {
                        const bodyText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                        if (matcher.words.some(word => bodyText.includes(word))) matcherPassed = true;
                    } else if (matcher.type === 'regex') {
                        const bodyText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
                        let regexStr = matcher.regex;
                        if (regexStr.startsWith('(?i)')) regexStr = regexStr.substring(4);
                        if (new RegExp(regexStr, 'i').test(bodyText)) matcherPassed = true;
                    }
                    if (!matcherPassed) {
                        isMatch = false;
                        break;
                    }
                }

                if (isMatch) {
                    findings.push({
                        name: rule.info?.name || 'Test Match',
                        severity: 'HIGH',
                        payload: payload
                    });
                    break;
                }
            }
        } finally {
            await prisma.customTemplate.delete({ where: { id: tempTemplate.id } });
        }

        res.json({ findings });

    } catch (err) {
        logger.error(`Error testing template: ${err.message}`);
        res.status(500).json({ error: 'Failed to test template', details: err.message });
    }
});

export default router;
