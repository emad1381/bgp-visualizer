/**
 * BGP Service - API Integration Layer
 * Uses RIPEstat APIs exclusively for BGP data
 */

// API Endpoints - RIPEstat Only
const API_ENDPOINTS = {
  RIPESTAT_NETWORK: 'https://stat.ripe.net/data/network-info/data.json',
  RIPESTAT_AS_OVERVIEW: 'https://stat.ripe.net/data/as-overview/data.json',
  RIPESTAT_ASN_NEIGHBOURS: 'https://stat.ripe.net/data/asn-neighbours/data.json',
  RIPESTAT_ANNOUNCED_PREFIXES: 'https://stat.ripe.net/data/announced-prefixes/data.json',
  RIPESTAT_LOOKING_GLASS: 'https://stat.ripe.net/data/looking-glass/data.json',
  RIPESTAT_BGP_STATE: 'https://stat.ripe.net/data/bgp-state/data.json',
  IP_API: 'https://ip-api.com/json', // HTTPS! http:// gets blocked by browsers on HTTPS pages (mixed content)
};

// Known ASN to Country Code mapping for major providers
const KNOWN_ASN_COUNTRIES = {
  // Google
  15169: 'US', 36040: 'US', 19527: 'US', 36692: 'US',
  // Cloudflare
  13335: 'US',
  // Amazon AWS
  16509: 'US', 14618: 'US',
  // Microsoft
  8075: 'US',
  // Level3/Lumen/CenturyLink
  3356: 'US', 3549: 'US', 1: 'US',
  // Cogent
  174: 'US',
  // Hurricane Electric
  6939: 'US',
  // NTT
  2914: 'JP',
  // Telia
  1299: 'SE',
  // GTT (née Tinet)
  3257: 'GB',
  // PCCW Global
  3491: 'HK',
  // Tata Communications
  6453: 'IN',
  // China Telecom
  4134: 'CN', 4809: 'CN',
  // China Unicom
  4837: 'CN', 9929: 'CN',
  // Deutsche Telekom
  3320: 'DE',
  // Telefonica
  12956: 'ES',
  // Orange
  5511: 'FR',
  // RETN
  9002: 'LU',
  // Zayo
  6461: 'US',
  // Verizon Business
  701: 'US', 702: 'US', 703: 'US',
  // AT&T
  7018: 'US',
  // Sprint
  1239: 'US',
  // Comcast
  7922: 'US', 7015: 'US',
  // APNIC/Singapore
  24482: 'SG',
  // Telstra Australia
  4637: 'AU',
  // SEACOM South Africa
  37100: 'ZA',
  // i3D.net Netherlands
  25605: 'NL',
  // Reannz New Zealand
  9583: 'NZ',
  // Iran AS
  16322: 'IR', 44244: 'IR', 49100: 'IR', 48147: 'IR', 12880: 'IR',
  31549: 'IR', 24940: 'IR', 41881: 'IR', 58224: 'IR', 39074: 'IR',
};

/**
 * Known Tier-1 and major AS Names
 * This provides instant name lookup without API calls
 */
const KNOWN_TIER1_ASNS = {
  // Tier-1 Providers
  '3356': 'Level3 / Lumen',
  '1299': 'Twelve99 / Arelion',
  '2914': 'NTT America',
  '6453': 'Tata Communications',
  '6762': 'Sparkle / Telecom Italia',
  '174': 'Cogent Communications',
  '6939': 'Hurricane Electric',
  '701': 'Verizon / UUNET',
  '6461': 'Zayo Bandwidth',
  '3257': 'GTT Communications',
  '1239': 'Sprint',
  '7922': 'Comcast',

  // Major Cloud Providers
  '15169': 'Google LLC',
  '16509': 'Amazon.com',
  '8075': 'Microsoft',
  '20940': 'Akamai',
  '13335': 'Cloudflare',

  // Additional Known ASNs
  '32934': 'Facebook / Meta',
  '36692': 'Google',
  '395973': 'Google-2',
  '32381': 'Google Cloud',
  '396982': 'Google Cloud Platform',
  '36492': 'Google Wifi',
  '394089': 'GCP Enterprise',
  '24482': 'SG.GS',
};

/**
 * Robust AS Name Fetcher
 * STEP 1: Check local dictionary (instant)
 * STEP 2: Fetch from RIPEstat API
 * STEP 3: Return null if both fail
 * @param {number|string} asn - AS Number
 * @returns {Promise<string|null>} - AS Name or null
 */
const fetchASName = async (asn) => {
  // FORCE convert to string for reliable dictionary lookup
  const asnStr = String(asn).trim();

  // STEP 1: Dictionary check FIRST (no API call)
  if (KNOWN_TIER1_ASNS[asnStr]) {
    return KNOWN_TIER1_ASNS[asnStr];
  }

  // STEP 2: API fetch if not in dictionary
  try {
    const response = await fetchWithTimeout(
      `${API_ENDPOINTS.RIPESTAT_AS_OVERVIEW}?resource=AS${asnStr}`,
      5000
    );
    const holder = response?.data?.holder;

    if (holder) {
      return holder;
    }
  } catch {
    // silent — callers handle the fallback
  }

  // STEP 3: Return null (caller handles fallback)
  return null;
};

/**
 * Validate IP address format
 * @param {string} ip - IP address to validate
 * @returns {object} - { valid: boolean, type: 'ipv4' | 'ipv6' | null }
 */
export function validateIP(ip) {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){0,6}::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$/;

  if (ipv4Regex.test(ip)) {
    return { valid: true, type: 'ipv4' };
  }
  if (ipv6Regex.test(ip)) {
    return { valid: true, type: 'ipv6' };
  }
  return { valid: false, type: null };
}

/**
 * Validate domain name format
 * @param {string} domain - Domain name to validate
 * @returns {boolean} - true if valid domain
 */
export function validateDomain(domain) {
  // Domain regex: allows subdomains, TLDs, etc.
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

/**
 * Resolve domain name to IP address using DNS lookup
 * @param {string} domain - Domain name to resolve
 * @returns {Promise<string>} - Resolved IP address
 */
export async function resolveDomainToIP(domain) {
  try {
    // Use Google DNS-over-HTTPS API (better CORS support)
    const dnsUrl = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`;

    const response = await fetch(dnsUrl);
    if (!response.ok) {
      throw new Error(`DNS query failed: ${response.status}`);
    }
    const data = await response.json();

    if (data.Answer && data.Answer.length > 0) {
      // Find first A record (IPv4)
      const aRecord = data.Answer.find(record => record.type === 1);
      if (aRecord && aRecord.data) {
        return aRecord.data;
      }
    }

    throw new Error('No A record found for domain');
  } catch (error) {
    throw new Error(`DNS resolution failed: ${error.message}`);
  }
}

/**
 * Fetch with timeout and error handling
 * @param {string} url - URL to fetch
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<object>} - JSON response
 */
async function fetchWithTimeout(url, timeout = 6000) { // Reduced to 6s for speed
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - API too slow');
    }
    throw error;
  }
}

/**
 * Get IP network information from RIPEstat
 * @param {string} ip - IP address
 * @returns {Promise<object>} - Network info data
 */
export async function getIPInfo(ip) {
  try {
    const data = await fetchWithTimeout(`${API_ENDPOINTS.RIPESTAT_NETWORK}?resource=${ip}`, 12000); // 12s for slow RIPEstat

    if (data.status !== 'ok' || !data.data) {
      throw new Error('No network data found for this IP');
    }

    const ripeData = data.data;

    // Extract ASN - RIPE returns asns as array
    const primaryASN = ripeData.asns && ripeData.asns.length > 0 ? ripeData.asns[0] : null;

    return {
      ip: ip,
      prefix: ripeData.prefix || null,
      asn: primaryASN,
      holder: ripeData.holder || 'Unknown',
      allASNs: ripeData.asns || [],
    };
  } catch (error) {
    console.error('RIPEstat network-info fetch error:', error);
    // Return fallback instead of crashing
    return {
      ip: ip,
      prefix: null,
      asn: null,
      holder: 'Unknown',
      allASNs: [],
      error: error.message,
    };
  }
}

/**
 * Get AS overview from RIPEstat
 * @param {number} asn - AS Number
 * @returns {Promise<object>} - AS overview data
 */
export async function getASOverview(asn) {
  try {
    const data = await fetchWithTimeout(`${API_ENDPOINTS.RIPESTAT_AS_OVERVIEW}?resource=AS${asn}`);

    if (data.status !== 'ok' || !data.data) {
      return {
        asn: asn,
        name: 'Unknown',
        description: '',
        countryCode: null,
      };
    }

    const asData = data.data;

    return {
      asn: asn,
      name: asData.holder || 'Unknown',
      description: asData.holder || '',
      countryCode: null, // RIPEstat doesn't provide country in as-overview
      announced: asData.announced || false,
    };
  } catch (error) {
    console.error('RIPEstat AS overview fetch error:', error);
    return {
      asn: asn,
      name: 'Unknown',
      description: '',
      countryCode: null,
    };
  }
}

/**
 * Fetch upstreams for a specific ASN (for interactive exploration)
 * @param {number} asn - AS Number to fetch upstreams for
 * @returns {Promise<Array>} - Array of upstream AS objects with country codes
 */
export async function fetchASUpstreams(asn) {
  try {
    const neighbours = await getASNNeighbours(asn);
    return neighbours.upstreams.map(upstream => ({
      ...upstream,
      countryCode: upstream.countryCode || getKnownASCountry(upstream.asn),
    }));
  } catch (error) {
    console.error(`Error fetching upstreams for AS${asn}:`, error);
    return [];
  }
}

/**
 * Try to extract a 2-letter country code from an AS holder name.
 * RIPE-region holders follow "NAME-XX" convention (e.g. ARVANCLOUD-CDN-IR).
 * @param {string} holder - AS holder name
 * @returns {string|null} - ISO country code or null
 */
function countryFromHolder(holder) {
  if (!holder) return null;
  // Matches trailing "-XX" (exactly 2 uppercase letters after a dash)
  const m = holder.match(/-([A-Z]{2})$/);
  return m ? m[1] : null;
}

// Simple in-memory cache for resolved ASN -> country (avoids re-fetching)
const asCountryCache = new Map();

/**
 * Resolve the country of an ASN by geolocating a few of its announced
 * prefixes via ipwho.is, and picking the most common country.
 * @param {number|string} asn - AS Number
 * @returns {Promise<string|null>} - ISO country code
 */
async function getASCountryFromPrefixes(asn) {
  const key = String(asn);
  if (asCountryCache.has(key)) return asCountryCache.get(key);

  try {
    // 1. Get up to 4 announced IPv4 prefixes for this ASN
    const prefixesData = await fetchWithTimeout(
      `${API_ENDPOINTS.RIPESTAT_ANNOUNCED_PREFIXES}?resource=AS${key}`,
      5000
    );
    const prefixes = (prefixesData?.data?.prefixes || [])
      .map(p => p.prefix)
      .filter(p => p && p.includes('.')) // IPv4 only
      .slice(0, 4);

    if (prefixes.length === 0) {
      asCountryCache.set(key, null);
      return null;
    }

    // 2. Geolocate each prefix's first IP
    const results = await Promise.allSettled(
      prefixes.map(prefix =>
        fetchWithTimeout(`https://ipwho.is/${prefix.split('/')[0]}`, 5000)
      )
    );

    // 3. Pick the most common country code (mode)
    const counts = {};
    results.forEach(r => {
      if (r.status === 'fulfilled' && r.value?.success && r.value.country_code) {
        counts[r.value.country_code] = (counts[r.value.country_code] || 0) + 1;
      }
    });

    let best = null, bestCount = 0;
    Object.entries(counts).forEach(([cc, count]) => {
      if (count > bestCount) { best = cc; bestCount = count; }
    });

    asCountryCache.set(key, best);
    return best;
  } catch {
    asCountryCache.set(key, null);
    return null;
  }
}

/**
 * Resolve a country code for an ASN, best effort:
 * 1. Known dictionary (fast, no API)
 * 2. Country code from announced prefixes via ipwho.is (accurate)
 * @param {number|string} asn - AS Number
 * @returns {Promise<string|null>} - ISO country code
 */
async function resolveASCountry(asn) {
  const fromDict = getKnownASCountry(asn);
  if (fromDict) return fromDict;
  return getASCountryFromPrefixes(asn);
}

/**
 * Get ASN neighbours (upstreams/peers) from RIPEstat
 * Also fetches AS names for each neighbour
 * @param {number} asn - AS Number
 * @returns {Promise<object>} - Neighbour ASNs with names
 */
export async function getASNNeighbours(asn) {
  try {
    const data = await fetchWithTimeout(`${API_ENDPOINTS.RIPESTAT_ASN_NEIGHBOURS}?resource=AS${asn}`);

    if (data.status !== 'ok' || !data.data) {
      return { neighbours: [], upstreams: [], peers: [] };
    }

    const neighbours = data.data.neighbours || [];

    // Classify neighbours by RIPEstat relationship:
    //   - type "upstream" (the neighbour announces the resource to us) = upstream
    //   - type "downstream" (we announce to them) = downstream — skip
    //   - type "peer" / "lateral" = peer
    let upstreamASNs = neighbours.filter(n => n.type === 'upstream').slice(0, 8);
    let peerASNs = neighbours.filter(n => n.type === 'peer' || n.type === 'lateral').slice(0, 6);

    // If RIPEstat gave no type info (fallback), keep the previous heuristic:
    // higher power = more likely upstream
    if (upstreamASNs.length === 0 && peerASNs.length === 0) {
      const sorted = [...neighbours].sort((a, b) => (b.power || 0) - (a.power || 0));
      upstreamASNs = sorted.slice(0, 8);
      peerASNs = sorted.slice(8, 12);
    }

    // Fetch AS names for upstreams in parallel
    const upstreamPromises = upstreamASNs.map(async (n) => {
      try {
        const asData = await fetchWithTimeout(
          `${API_ENDPOINTS.RIPESTAT_AS_OVERVIEW}?resource=AS${n.asn}`,
          5000 // shorter timeout for individual lookups
        );

        // RIPEstat returns nested structure: data.data.holder
        const holder = KNOWN_TIER1_ASNS[String(n.asn)] || asData?.data?.holder || `AS${n.asn}`;

        return {
          asn: n.asn,
          name: holder,
          power: n.power,
          type: n.type,
          // Country: known dict first, else via announced prefixes
          countryCode: await resolveASCountry(n.asn),
        };
      } catch {
        return {
          asn: n.asn,
          name: KNOWN_TIER1_ASNS[String(n.asn)] || `AS${n.asn}`,
          power: n.power,
          type: n.type,
          countryCode: getKnownASCountry(n.asn),
        };
      }
    });

    // Fetch AS names for peers in parallel
    const peerPromises = peerASNs.map(async (n) => {
      try {
        const asData = await fetchWithTimeout(
          `${API_ENDPOINTS.RIPESTAT_AS_OVERVIEW}?resource=AS${n.asn}`,
          5000
        );

        // RIPEstat returns nested structure: data.data.holder
        const holder = KNOWN_TIER1_ASNS[String(n.asn)] || asData?.data?.holder || `AS${n.asn}`;

        return {
          asn: n.asn,
          name: holder,
          power: n.power,
          type: n.type,
          countryCode: await resolveASCountry(n.asn),
        };
      } catch {
        return {
          asn: n.asn,
          name: KNOWN_TIER1_ASNS[String(n.asn)] || `AS${n.asn}`,
          power: n.power,
          type: n.type,
          countryCode: getKnownASCountry(n.asn),
        };
      }
    });

    // **STRICT LOADING:** Wait for ALL names to be fetched (parallel)
    const [upstreams, peers] = await Promise.all([
      Promise.all(upstreamPromises),
      Promise.all(peerPromises),
    ]);

    return {
      upstreams,
      peers,
    };
  } catch (error) {
    console.error('RIPEstat ASN neighbours fetch error:', error);
    return { upstreams: [], peers: [] };
  }
}

/**
 * Get geolocation data
 * Tries ip-api first; falls back to ipwho.is (free, CORS-enabled) when
 * ip-api rejects the request (403 on free HTTPS plans or browser CORS).
 * @param {string} ip - IP address
 * @returns {Promise<object|null>} - Geolocation data
 */
export async function getGeolocation(ip) {
  // Primary: ip-api
  try {
    const data = await fetchWithTimeout(`${API_ENDPOINTS.IP_API}/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as`);

    if (data.status === 'success') {
      return {
        country: data.country,
        countryCode: data.countryCode,
        region: data.regionName,
        city: data.city,
        lat: data.lat,
        lon: data.lon,
        timezone: data.timezone,
        isp: data.isp,
        org: data.org,
        as: data.as,
      };
    }
    console.warn('ip-api geolocation failed:', data.message);
  } catch (error) {
    console.warn('ip-api geolocation error:', error.message);
  }

  // Fallback: ipwho.is (free, HTTPS, CORS-friendly)
  try {
    const fallback = await fetchWithTimeout(`https://ipwho.is/${ip}`, 6000);
    if (fallback && fallback.success) {
      return {
        country: fallback.country,
        countryCode: fallback.country_code,
        region: fallback.region || fallback.state,
        city: fallback.city,
        lat: fallback.latitude,
        lon: fallback.longitude,
        timezone: fallback.timezone?.id,
        isp: fallback.connection?.isp,
        org: fallback.connection?.org,
        as: fallback.connection?.asn ? `AS${fallback.connection.asn}` : null,
      };
    }
  } catch (error) {
    console.warn('ipwho.is geolocation error:', error.message);
  }

  return null;
}

/**
 * Get BGP paths from Looking Glass to analyze primary/backup routes
 * Extracts full AS path chain from origin to Tier-1
 * @param {string} prefix - Network prefix
 * @returns {Promise<object>} - Path analysis with full chain
 */
export async function getBGPPaths(prefix) {
  if (!prefix) return { paths: [], primaryASN: null, backupASNs: [], fullChain: [] };

  try {
    const data = await fetchWithTimeout(
      `${API_ENDPOINTS.RIPESTAT_LOOKING_GLASS}?resource=${prefix}`,
      10000
    );

    if (data.status !== 'ok' || !data.data || !data.data.rrcs) {
      return { paths: [], primaryASN: null, backupASNs: [], fullChain: [] };
    }

    const allPaths = [];

    // Collect all AS paths from all route collectors
    Object.values(data.data.rrcs).forEach(rrc => {
      if (rrc.peers) {
        rrc.peers.forEach(peer => {
          if (peer.as_path) {
            // Clean path - remove prepending duplicates for chain analysis
            const rawPath = peer.as_path.split(' ').map(Number).filter(n => !isNaN(n));
            const cleanPath = removePrepending(rawPath);

            if (cleanPath.length > 0) {
              allPaths.push({
                path: rawPath,
                cleanPath: cleanPath,
                pathLength: cleanPath.length,
                firstHop: cleanPath[0],
                hasPrepending: detectPrepending(rawPath),
                prepended: getPrependedASN(rawPath),
              });
            }
          }
        });
      }
    });

    // Analyze paths to find primary vs backup upstreams
    const upstreamAnalysis = analyzeUpstreams(allPaths);

    // Find the most common/shortest clean path as the "primary route chain"
    const primaryChain = findPrimaryChain(allPaths);

    // Get AS names for the primary chain
    const fullChain = await resolveChainNames(primaryChain);

    return {
      paths: allPaths.slice(0, 20),
      ...upstreamAnalysis,
      primaryChain,
      fullChain, // Full chain with names: [{asn, name, level}, ...]
    };
  } catch (error) {
    console.error('Looking Glass fetch error:', error);
    return { paths: [], primaryASN: null, backupASNs: [], fullChain: [] };
  }
}

/**
 * Remove prepending from AS path (consecutive duplicates)
 */
function removePrepending(path) {
  if (path.length === 0) return [];
  const result = [path[0]];
  for (let i = 1; i < path.length; i++) {
    if (path[i] !== path[i - 1]) {
      result.push(path[i]);
    }
  }
  return result;
}

/**
 * Find the primary (most common/shortest) clean path chain
 */
function findPrimaryChain(paths) {
  if (paths.length === 0) return [];

  // Group paths by their clean path signature
  const pathCounts = {};
  paths.forEach(p => {
    const sig = p.cleanPath.join('-');
    if (!pathCounts[sig]) {
      pathCounts[sig] = { path: p.cleanPath, count: 0, length: p.cleanPath.length };
    }
    pathCounts[sig].count++;
  });

  // Sort by: count desc, then length asc
  const sorted = Object.values(pathCounts).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.length - b.length;
  });

  // Return the most common path (reversed: from origin to Tier-1)
  // The path is already from Tier-1 towards origin, we want origin to Tier-1
  return sorted[0]?.path.slice().reverse() || [];
}

/**
 * Resolve AS names and country codes for a chain of ASNs
 */
async function resolveChainNames(chain) {
  if (chain.length === 0) return [];

  // Fetch names in parallel (limit to first 8 to avoid too many requests)
  const limitedChain = chain.slice(0, 8);

  const promises = limitedChain.map(async (asn, index) => {
    try {
      const data = await fetchWithTimeout(
        `${API_ENDPOINTS.RIPESTAT_AS_OVERVIEW}?resource=AS${asn}`,
        4000
      );

      // Country: known dict first, else via announced prefixes
      const holder = data?.data?.holder || '';
      const countryCode = await resolveASCountry(asn);

      return {
        asn,
        name: holder || `AS${asn}`,
        countryCode,
        level: index,
        isTier1: isTier1AS(asn),
      };
    } catch {
      return {
        asn,
        name: `AS${asn}`,
        countryCode: getTier1Country(asn),
        level: index,
        isTier1: isTier1AS(asn),
      };
    }
  });

  return Promise.all(promises);
}

/**
 * Get country code for known ASNs (Tier-1, major ISPs, etc.)
 * Exported for use in graph generation
 */
function getKnownASCountry(asn) {
  const knownCountries = {
    // Tier-1 providers
    174: 'US',    // Cogent
    1299: 'SE',   // Arelion (Sweden)
    2914: 'US',   // NTT America
    3257: 'DE',   // GTT
    3320: 'DE',   // Deutsche Telekom
    3356: 'US',   // Lumen
    5511: 'FR',   // Orange
    6453: 'US',   // Tata
    6461: 'US',   // Zayo
    6762: 'IT',   // Sparkle
    6830: 'NL',   // Liberty Global
    7018: 'US',   // AT&T
    12956: 'ES',  // Telefonica

    // Iranian ISPs
    44244: 'IR',  // Irancell
    197207: 'IR', // MCI
    58224: 'IR',  // TIC
    49666: 'IR',  // TIC
    48159: 'IR',  // Telecommunication Infrastructure Company
    31549: 'IR',  // Aria Shatel
    206647: 'IR', // Arax
    198154: 'IR', // PARSABR / Pars
    42337: 'IR',  // Respina
    205207: 'IR', // ABRENIK
    43754: 'IR',  // Asiatech
    50810: 'IR',  // Mobinnet
    56402: 'IR',  // Fanava
    57218: 'IR',  // Rightel
    39501: 'IR',  // Global

    // Major global providers
    13335: 'US',  // Cloudflare
    15169: 'US',  // Google
    16509: 'US',  // Amazon
    8075: 'US',   // Microsoft
    32934: 'US',  // Facebook/Meta
    20940: 'US',  // Akamai
    16625: 'US',  // Akamai
    14618: 'US',  // Amazon AWS
    396982: 'US', // Google Cloud
    36492: 'US',  // Google Wifi
    394089: 'US', // Google Enterprise
    6939: 'US',   // Hurricane Electric
    32381: 'US',  // Google Cloud
    395973: 'US', // Google-2
    24482: 'SG',  // SG.GS

    // European providers
    3215: 'FR',   // Orange France
    12322: 'FR',  // Free
    5410: 'DE',   // Deutsche Land
    680: 'DE',    // DFN

    // Asian providers
    4766: 'KR',   // Korea Telecom
    4134: 'CN',   // Chinanet
    4837: 'CN',   // China Unicom
    9808: 'HK',   // CMHK

    // Middle East
    8781: 'SA',   // STC Saudi
    29049: 'AE',  // Etisalat UAE
  };
  return knownCountries[Number(asn)] || null;
}

// Alias for backward compatibility
const getTier1Country = getKnownASCountry;

// List of known Tier-1 ASNs (no upstream providers)
const TIER1_ASNS = [
  174,    // Cogent
  1299,   // Arelion (formerly Telia)
  2914,   // NTT
  3257,   // GTT
  3320,   // Deutsche Telekom
  3356,   // Lumen (Level3)
  5511,   // Orange
  6453,   // Tata Communications
  6461,   // Zayo
  6762,   // Telecom Italia Sparkle
  6830,   // Liberty Global
  7018,   // AT&T
  12956,  // Telefonica
];

/**
 * Check if an ASN is a known Tier-1 provider
 */
function isTier1AS(asn) {
  return TIER1_ASNS.includes(Number(asn));
}

/**
 * Detect AS path prepending (repeated ASNs)
 * @param {number[]} path - AS path array
 * @returns {boolean} - True if prepending detected
 */
function detectPrepending(path) {
  for (let i = 0; i < path.length - 1; i++) {
    if (path[i] === path[i + 1]) {
      return true;
    }
  }
  return false;
}

/**
 * Get the prepended ASN from path
 * @param {number[]} path - AS path array
 * @returns {number|null} - The ASN that is prepended, or null
 */
function getPrependedASN(path) {
  for (let i = 0; i < path.length - 1; i++) {
    if (path[i] === path[i + 1]) {
      return path[i];
    }
  }
  return null;
}

/**
 * Analyze upstreams to determine primary vs backup
 * @param {object[]} paths - Array of path objects
 * @returns {object} - primaryASN, backupASNs, upstreamInfo
 */
function analyzeUpstreams(paths) {
  if (paths.length === 0) {
    return { primaryASN: null, backupASNs: [], upstreamInfo: {} };
  }

  // Count occurrences of each first-hop ASN and track properties
  const upstreamStats = {};

  paths.forEach(p => {
    const asn = p.firstHop;
    if (!upstreamStats[asn]) {
      upstreamStats[asn] = {
        asn,
        count: 0,
        minPathLength: Infinity,
        maxPathLength: 0,
        hasPrepending: false,
        totalPathLength: 0,
      };
    }
    upstreamStats[asn].count++;
    upstreamStats[asn].minPathLength = Math.min(upstreamStats[asn].minPathLength, p.pathLength);
    upstreamStats[asn].maxPathLength = Math.max(upstreamStats[asn].maxPathLength, p.pathLength);
    upstreamStats[asn].totalPathLength += p.pathLength;
    if (p.hasPrepending) {
      upstreamStats[asn].hasPrepending = true;
    }
  });

  // Calculate average path length for each upstream
  Object.values(upstreamStats).forEach(stat => {
    stat.avgPathLength = stat.totalPathLength / stat.count;
  });

  // Sort by: 
  // 1. No prepending preferred
  // 2. Shorter average path length preferred
  // 3. Higher count (more routes seen) preferred
  const sorted = Object.values(upstreamStats).sort((a, b) => {
    // Prepended paths are backup
    if (a.hasPrepending !== b.hasPrepending) {
      return a.hasPrepending ? 1 : -1;
    }
    // Shorter path is primary
    if (a.avgPathLength !== b.avgPathLength) {
      return a.avgPathLength - b.avgPathLength;
    }
    // More routes = more reliable
    return b.count - a.count;
  });

  const primaryASN = sorted.length > 0 ? sorted[0].asn : null;
  const backupASNs = sorted.slice(1).map(s => s.asn);

  // Create upstreamInfo map for quick lookup
  const upstreamInfo = {};
  sorted.forEach((stat, index) => {
    upstreamInfo[stat.asn] = {
      ...stat,
      isPrimary: index === 0,
      isBackup: index > 0,
      rank: index + 1,
    };
  });

  return { primaryASN, backupASNs, upstreamInfo };
}

/**
 * Get complete BGP data for an IP - Using RIPEstat exclusively
 * @param {string} ip - IP address
 * @returns {Promise<object>} - Complete BGP data
 */
export async function getCompleteBGPData(ip) {
  const validation = validateIP(ip);
  if (!validation.valid) {
    throw new Error('Invalid IP address format');
  }

  // Fetch IP network info from RIPEstat
  const ipInfo = await getIPInfo(ip);

  // Get geolocation (this uses ip-api, not BGPView)
  const geolocation = await getGeolocation(ip);

  // Get the primary ASN
  const primaryASN = ipInfo.asn;

  // If no ASN found, return with geolocation only
  if (!primaryASN) {
    return {
      ip,
      ipType: validation.type,
      prefix: {
        prefix: ipInfo.prefix || 'Unknown',
        name: ipInfo.holder || 'Unknown',
        description: '',
      },
      primaryAS: {
        asn: 0,
        name: 'Unknown ASN',
        description: 'No ASN data available from RIPEstat',
        countryCode: geolocation?.countryCode || null,
      },
      upstreams: [],
      peers: [],
      geolocation,
      rir: 'Unknown',
      allPrefixes: [],
      error: ipInfo.error || null,
    };
  }

  // Fetch AS details, neighbours, and path analysis in parallel
  const [asOverview, neighbours, pathAnalysis] = await Promise.all([
    getASOverview(primaryASN),
    getASNNeighbours(primaryASN),
    getBGPPaths(ipInfo.prefix), // Restored for full graph
  ]);

  // Use geolocation country code if AS overview doesn't have it
  const countryCode = asOverview.countryCode || geolocation?.countryCode || null;

  // **STRICT LOADING POLICY:**
  // Merge path analysis into upstreams and ensure ALL data is hydrated.
  // Guard against missing pathAnalysis (e.g. looking-glass timeout) so a
  // slow API never crashes the whole search.
  const upstreamInfo = pathAnalysis?.upstreamInfo || {};
  const upstreamsWithPathInfo = neighbours.upstreams.map(u => ({
    ...u,
    isPrimary: upstreamInfo[u.asn]?.isPrimary || false,
    isBackup: upstreamInfo[u.asn]?.isBackup || false,
    isTier1: isTier1AS(u.asn), // tier-1 is a property of the AS itself, not the path
    rank: upstreamInfo[u.asn]?.rank || 999,
    // Name and countryCode are ALREADY fetched in getASNNeighbours
    // This ensures 100% hydrated data before rendering
  }));

  // Sort upstreams by rank (primary first)
  upstreamsWithPathInfo.sort((a, b) => a.rank - b.rank);

  // **STRICT LOADING:** All names are fetched, all flags are set
  // UI will receive complete data with no undefined values
  return {
    ip,
    ipType: validation.type,
    prefix: {
      prefix: ipInfo.prefix || 'Unknown',
      name: ipInfo.holder || asOverview.name,
      description: asOverview.description,
    },
    primaryAS: {
      asn: primaryASN,
      name: asOverview.name || ipInfo.holder || 'Unknown',
      description: asOverview.description || ipInfo.holder || '',
      countryCode: countryCode,
      announced: asOverview.announced,
    },
    upstreams: upstreamsWithPathInfo,
    peers: neighbours.peers,
    geolocation,
    rir: 'RIPE NCC',
    allPrefixes: [{ prefix: ipInfo.prefix }],
    allASNs: ipInfo.allASNs,
    pathAnalysis: {
      ...pathAnalysis,
      // Add backupPaths for graph visualization (full upstream objects, not just ASNs)
      backupPaths: upstreamsWithPathInfo.filter(u => u.isBackup === true),
    },
  };
}

/**
 * Generate graph data for React Flow
 * NEW LAYOUT: Vertical tower showing full AS path chain to Tier-1
 * No overlapping - proper spacing for all nodes
 * @param {object} bgpData - Complete BGP data
 * @returns {object} - { nodes: [], edges: [] }
 */
export function generateGraphData(bgpData) {
  const nodes = [];
  const edges = [];

  // === LAYOUT CONFIGURATION ===
  // Node dimensions (approximate)
  const NODE_WIDTH = 280;
  const NODE_HEIGHT = 100;
  const VERTICAL_GAP = 40;
  const HORIZONTAL_GAP = 60;

  // Calculate positions
  const CENTER_X = 500;

  // Start from bottom and go up
  let currentY = 600; // Starting Y position (bottom of graph)

  // === 1. IP NODE (Bottom Center) ===
  nodes.push({
    id: 'ip',
    type: 'ipNode',
    position: { x: CENTER_X - 100, y: currentY },
    data: {
      ip: bgpData.ip,
      type: bgpData.ipType,
      prefix: bgpData.prefix.prefix,
    },
  });

  // === 2. PREFIX NODE (Left of IP) ===
  nodes.push({
    id: 'prefix',
    type: 'prefixNode',
    position: { x: CENTER_X - 100 - NODE_WIDTH - HORIZONTAL_GAP, y: currentY },
    data: {
      prefix: bgpData.prefix.prefix,
      name: bgpData.prefix.name,
      rir: bgpData.rir,
    },
  });
  edges.push({
    id: 'ip-to-prefix',
    source: 'ip',
    target: 'prefix',
    type: 'smoothstep',
    style: { stroke: '#10b981', strokeWidth: 2, strokeDasharray: '5,5' },
  });

  // === 3. GEOLOCATION NODE (Right of IP) ===
  if (bgpData.geolocation) {
    nodes.push({
      id: 'geo',
      type: 'geoNode',
      position: { x: CENTER_X + 100 + HORIZONTAL_GAP, y: currentY },
      data: {
        country: bgpData.geolocation.country,
        countryCode: bgpData.geolocation.countryCode,
        city: bgpData.geolocation.city,
        isp: bgpData.geolocation.isp,
      },
    });
    edges.push({
      id: 'ip-to-geo',
      source: 'ip',
      target: 'geo',
      type: 'smoothstep',
      style: { stroke: '#f43f5e', strokeWidth: 2, strokeDasharray: '5,5' },
    });
  }

  // Move up for Primary AS
  currentY -= (NODE_HEIGHT + VERTICAL_GAP);

  // === 4. PRIMARY AS NODE (Above IP) ===
  const primaryASNodeId = `as-${bgpData.primaryAS.asn}`;
  nodes.push({
    id: primaryASNodeId,
    type: 'asNode',
    position: { x: CENTER_X - 120, y: currentY },
    data: {
      asn: bgpData.primaryAS.asn,
      name: bgpData.primaryAS.name,
      description: bgpData.primaryAS.description,
      countryCode: bgpData.primaryAS.countryCode,
      isPrimary: true,
    },
  });
  edges.push({
    id: `ip-to-${primaryASNodeId}`,
    source: 'ip',
    target: primaryASNodeId,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#6366f1', strokeWidth: 3 },
    label: 'Origin AS',
    labelStyle: { fill: '#6366f1', fontWeight: 600, fontSize: 10 },
    labelBgStyle: { fill: '#0a0a10', fillOpacity: 0.8 },
    labelBgPadding: [4, 6],
    labelBgBorderRadius: 4,
  });

  // === 5. FULL AS PATH CHAIN (From Primary AS up to Tier-1) ===
  // Use fullChain from pathAnalysis
  const fullChain = bgpData.pathAnalysis?.fullChain || [];
  let previousNodeId = primaryASNodeId;

  // Skip first element if it's the same as primary AS
  const chainToShow = fullChain.filter(c => c.asn !== bgpData.primaryAS.asn);

  chainToShow.forEach((chainAS, index) => {
    currentY -= (NODE_HEIGHT + VERTICAL_GAP);

    const nodeId = `chain-${chainAS.asn}`;
    const isTier1 = chainAS.isTier1;

    nodes.push({
      id: nodeId,
      type: 'upstreamNode',
      position: { x: CENTER_X - 100, y: currentY },
      data: {
        asn: chainAS.asn,
        name: chainAS.name,
        countryCode: chainAS.countryCode || getKnownASCountry(chainAS.asn),
        isPrimary: false,
        isBackup: false,
        isTier1: isTier1,
        level: index + 1,
      },
    });

    // Edge from previous node
    edges.push({
      id: `${previousNodeId}-to-${nodeId}`,
      source: previousNodeId,
      target: nodeId,
      type: 'smoothstep',
      animated: true,
      style: {
        stroke: isTier1 ? '#fbbf24' : '#10b981',
        strokeWidth: isTier1 ? 4 : 3,
      },
      label: isTier1 ? '🌐 Tier-1 Transit' : `Level ${index + 1}`,
      labelStyle: {
        fill: isTier1 ? '#fbbf24' : '#10b981',
        fontWeight: 600,
        fontSize: isTier1 ? 11 : 9,
      },
      labelBgStyle: { fill: '#0a0a10', fillOpacity: 0.8 },
      labelBgPadding: [4, 6],
      labelBgBorderRadius: 4,
    });

    previousNodeId = nodeId;
  });

  // === 6. BACKUP UPSTREAMS (Right side - single column, properly aligned) ===
  // Manual filtering with Tier-1 prioritization (ensures AS1299, AS6453 show up)

  // Step 1: Get ASNs already used in main vertical chain
  const chainASNs = new Set(chainToShow.map(n => String(n.asn)));
  chainASNs.add(String(bgpData.primaryAS.asn)); // Also exclude primary AS

  // Step 2: Filter remaining upstreams (not in chain)
  const remainingUpstreams = bgpData.upstreams.filter(u =>
    !chainASNs.has(String(u.asn))
  );

  // Step 3: Sort - KNOWN_TIER1_ASNS first (real backbone providers)
  remainingUpstreams.sort((a, b) => {
    const isTier1A = !!KNOWN_TIER1_ASNS[String(a.asn)];
    const isTier1B = !!KNOWN_TIER1_ASNS[String(b.asn)];
    // Tier-1s come first
    if (isTier1A && !isTier1B) return -1;
    if (!isTier1A && isTier1B) return 1;
    return 0; // Keep original order for same category
  });

  // STRICT: Use pathAnalysis.backupPaths instead of manual filtering
  // This ensures graph shows exactly what InfoPanel shows
  const backupUpstreams = bgpData.pathAnalysis?.backupPaths || [];

  const BACKUP_X = CENTER_X + 320;  // Fixed X position for all backups
  const BACKUP_START_Y = 460;       // Start from Primary AS level
  const BACKUP_SPACING = 120;       // Vertical spacing between backups

  backupUpstreams.forEach((upstream, index) => {
    const nodeId = `backup-${upstream.asn}`;

    nodes.push({
      id: nodeId,
      type: 'upstreamNode',
      position: {
        x: BACKUP_X,
        y: BACKUP_START_Y - (index * BACKUP_SPACING),
      },
      data: {
        asn: upstream.asn,
        name: upstream.name,
        countryCode: upstream.countryCode || getKnownASCountry(upstream.asn),
        isPrimary: false,
        isBackup: true,
        hasPrepending: upstream.hasPrepending,
      },
    });

    edges.push({
      id: `${primaryASNodeId}-to-${nodeId}`,
      source: primaryASNodeId,
      target: nodeId,
      type: 'straight', // Straight lines for cleaner look
      style: { stroke: '#64748b', strokeWidth: 1, strokeDasharray: '6,4' },
      label: `Backup ${index + 1}`,
      labelStyle: { fill: '#64748b', fontWeight: 400, fontSize: 9 },
      labelBgStyle: { fill: '#0a0a10', fillOpacity: 0.9 },
      labelBgPadding: [3, 5],
      labelBgBorderRadius: 3,
    });
  });

  // === 7. PEERS (Left side - single column, properly aligned) ===
  const peers = bgpData.peers.slice(0, 4);
  const PEER_START_Y = 100;
  const PEER_X = CENTER_X - 450;

  peers.forEach((peer, index) => {
    const nodeId = `peer-${peer.asn}`;
    const yPos = PEER_START_Y + (index * (NODE_HEIGHT + VERTICAL_GAP));

    nodes.push({
      id: nodeId,
      type: 'peerNode',
      position: { x: PEER_X, y: yPos },
      data: {
        asn: peer.asn,
        name: peer.name || `AS${peer.asn}`, // Ensure name is always present
        countryCode: peer.countryCode || getKnownASCountry(peer.asn),
      },
    });

    // Edge from primary AS to peer
    edges.push({
      id: `${primaryASNodeId}-to-${nodeId}`,
      source: primaryASNodeId,
      target: nodeId,
      type: 'straight',
      style: { stroke: '#f59e0b', strokeWidth: 1, strokeDasharray: '4,4' },
      label: `Peer ${index + 1}`,
      labelStyle: { fill: '#f59e0b', fontWeight: 400, fontSize: 9 },
      labelBgStyle: { fill: '#0a0a10', fillOpacity: 0.9 },
      labelBgPadding: [3, 5],
      labelBgBorderRadius: 3,
    });
  });

  return { nodes, edges };
}


