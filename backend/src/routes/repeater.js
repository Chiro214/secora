import express from 'express';
import { executeRepeaterRequest } from '../engines/repeaterEngine.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();

/**
 * @route POST /api/repeater/send
 * @desc Executes a raw HTTP request via the SECORA Repeater Engine
 * @access Public (Will need auth later)
 */
router.post('/send', [
    body('method').isString().notEmpty().withMessage('HTTP Method is required'),
    body('url').isURL({ require_tld: false, require_protocol: true }).withMessage('Valid URL is required'),
    body('headers').optional().isObject(),
    body('body').optional()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
        const { method, url, headers, body } = req.body;
        
        // Execute the manual request
        const result = await executeRepeaterRequest({ method, url, headers, body });
        
        // Return exactly what the engine captured
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: 'Repeater Engine Error', message: error.message });
    }
});

export default router;
