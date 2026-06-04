// backend/src/engines/paramDiscovery.js
// Hidden parameter fuzzer — discovers undocumented GET/POST parameters
import axios from 'axios';

// Curated wordlist from SecLists burp-parameter-names (top 200)
const PARAM_WORDLIST = [
    'id','page','q','search','query','name','email','user','username','password',
    'token','key','api_key','apikey','secret','auth','session','redirect','url',
    'next','return','callback','continue','dest','destination','redir','redirect_uri',
    'return_to','goto','target','path','file','filename','dir','folder','type',
    'action','cmd','command','exec','func','function','handler','method','mode',
    'module','op','operation','process','step','task','view','category','cat',
    'sort','order','orderby','sort_by','limit','offset','start','count','per_page',
    'page_size','format','output','lang','language','locale','debug','test','admin',
    'role','group','level','status','state','active','enabled','hidden','private',
    'public','internal','preview','draft','version','v','ref','source','from','to',
    'date','start_date','end_date','year','month','day','filter','include','exclude',
    'fields','select','expand','embed','with','depth','max','min','size','width',
    'height','color','theme','style','template','layout','display','show','hide',
    'config','setting','settings','option','options','param','params','data','body',
    'content','text','message','title','description','comment','note','tag','tags',
    'label','value','code','pin','otp','verify','confirm','accept','deny','approve',
    'reject','cancel','delete','remove','update','edit','modify','create','add','new',
    'save','submit','upload','download','export','import','fetch','load','get','set',
    'put','post','patch','list','index','detail','details','info','information',
    'profile','account','billing','payment','price','amount','quantity','qty',
    'product','item','cart','checkout','invoice','subscription','plan','tier',
    'isAdmin','is_admin','admin_mode','bypass','backdoor','override','force',
    'no_cache','nocache','cache','refresh','reload','retry','timeout','delay','wait'
];

/**
 * Discover hidden parameters for an endpoint
 * @param {object} endpoint - { url, method }
 * @param {object} config - { maxParams, timeout, headers }
 * @returns {object} Discovered parameters
 */
export async function discoverParameters(endpoint, config = {}) {
    const maxParams = config.maxParams || 200;
    const timeout = config.timeout || 5000;
    const headers = { 'User-Agent': 'Secora-Scanner/2.0', ...(config.headers || {}) };
    const discovered = [];

    try {
        // Get baseline response
        const baseline = await axios.get(endpoint.url, {
            timeout, headers, validateStatus: () => true, maxRedirects: 3
        });
        const baselineLen = (baseline.data?.length || 0);
        const baselineStatus = baseline.status;

        // Test parameters in batches of 10
        const params = PARAM_WORDLIST.slice(0, maxParams);
        const batchSize = 10;

        for (let i = 0; i < params.length; i += batchSize) {
            const batch = params.slice(i, i + batchSize);
            const promises = batch.map(async (param) => {
                try {
                    const testUrl = new URL(endpoint.url);
                    testUrl.searchParams.set(param, 'secora_test_1');

                    const resp = await axios.get(testUrl.toString(), {
                        timeout, headers, validateStatus: () => true, maxRedirects: 3
                    });

                    const respLen = (resp.data?.length || 0);
                    const lenDiff = Math.abs(respLen - baselineLen);
                    const statusDiff = resp.status !== baselineStatus;

                    // Parameter is interesting if it changes response significantly
                    if (statusDiff || lenDiff > 50) {
                        return {
                            name: param,
                            evidence: {
                                statusChange: statusDiff ? `${baselineStatus} → ${resp.status}` : null,
                                lengthDiff: lenDiff > 50 ? `${baselineLen} → ${respLen} (Δ${lenDiff})` : null
                            }
                        };
                    }
                } catch { /* skip */ }
                return null;
            });

            const results = await Promise.all(promises);
            for (const r of results) {
                if (r) discovered.push(r);
            }
        }
    } catch (err) {
        console.warn(`Param discovery error for ${endpoint.url}: ${err.message}`);
    }

    return { endpoint: endpoint.url, discovered, count: discovered.length };
}

/**
 * Batch discover parameters for multiple endpoints
 */
export async function batchDiscoverParameters(endpoints, config = {}) {
    console.log(`🔎 Discovering hidden parameters across ${endpoints.length} endpoints`);
    const results = [];
    const limit = Math.min(endpoints.length, 20); // Limit to 20 endpoints

    for (let i = 0; i < limit; i++) {
        const result = await discoverParameters(endpoints[i], config);
        if (result.count > 0) {
            results.push(result);
            console.log(`  Found ${result.count} hidden params on ${endpoints[i].url}`);
        }
    }

    console.log(`  🔎 Param discovery complete: ${results.reduce((s, r) => s + r.count, 0)} params found`);
    return results;
}

export default { discoverParameters, batchDiscoverParameters };
