/**
 * BGP Service - API Integration Layer
 * Uses RIPEstat APIs exclusively for BGP data
 */

// API Endpoints - RIPEstat Only
const API_ENDPOINTS = {
  RIPESTAT_NETWORK: 'https://stat.ripe.net/data/network-info/data.json',
  RIPESTAT_AS_OVERVIEW: 'https://stat.ripe.net/data/as-overview/data.json',
  RIPESTAT_ASN_NEIGHBOURS: 'https://stat.ripe.net/data/asn-neighbours/data.json',
  RIPESTAT_LOOKING_GLASS: 'https://stat.ripe.net/data/looking-glass/data.json',
  RIPESTAT_BGP_STATE: 'https://stat.ripe.net/data/bgp-state/data.json',
  IP_API: 'http://ip-api.com/json',
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
 * Fetch with timeout and error handling
 * @param {string} url - URL to fetch
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<object>} - JSON response
 */
async function fetchWithTimeout(url, timeout = 15000) {
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
      throw new Error('Request timeout');
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
    const data = await fetchWithTimeout(`${API_ENDPOINTS.RIPESTAT_NETWORK}?resource=${ip}`);

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

    // Classify neighbours - higher power = more likely upstream
    // "left" type usually means upstream, "right" means downstream
    const sorted = [...neighbours].sort((a, b) => (b.power || 0) - (a.power || 0));

    // Top 5 by power are likely upstreams, next are peers
    const upstreamASNs = sorted.slice(0, 5);
    const peerASNs = sorted.slice(5, 10);

    // Fetch AS names for upstreams in parallel
    const upstreamPromises = upstreamASNs.map(async (n) => {
      try {
        const asData = await fetchWithTimeout(
          `${API_ENDPOINTS.RIPESTAT_AS_OVERVIEW}?resource=AS${n.asn}`,
          5000 // shorter timeout for individual lookups
        );
        const holder = asData?.data?.holder || `AS${n.asn}`;
        return {
          asn: n.asn,
          name: holder,
          power: n.power || 0,
          type: n.type || 'left',
        };
      } catch {
        return {
          asn: n.asn,
          name: `AS${n.asn}`,
          power: n.power || 0,
          type: n.type || 'left',
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
        const holder = asData?.data?.holder || `AS${n.asn}`;
        return {
          asn: n.asn,
          name: holder,
          power: n.power || 0,
          type: n.type || 'right',
        };
      } catch {
        return {
          asn: n.asn,
          name: `AS${n.asn}`,
          power: n.power || 0,
          type: n.type || 'right',
        };
      }
    });

    // Wait for all lookups
    const [upstreams, peers] = await Promise.all([
      Promise.all(upstreamPromises),
      Promise.all(peerPromises),
    ]);

    return { neighbours, upstreams, peers };
  } catch (error) {
    console.error('RIPEstat ASN neighbours fetch error:', error);
    return { neighbours: [], upstreams: [], peers: [] };
  }
}

/**
 * Get geolocation data
 * @param {string} ip - IP address
 * @returns {Promise<object>} - Geolocation data
 */
export async function getGeolocation(ip) {
  try {
    const data = await fetchWithTimeout(`${API_ENDPOINTS.IP_API}/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as`);

    if (data.status !== 'success') {
      console.warn('Geolocation failed:', data.message);
      return null;
    }

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
  } catch (error) {
    console.error('Geolocation fetch error:', error);
    return null;
  }
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

      // Get country code from the AS info or use known Tier-1 countries
      let countryCode = null;

      // Try to extract country from holder name (common patterns)
      const holder = data?.data?.holder || '';
      if (holder.includes(' - ')) {
        // Check for country patterns in the name
        const parts = holder.split(' - ');
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart.length === 2) {
          countryCode = lastPart.toUpperCase();
        }
      }

      // Known Tier-1 countries
      if (!countryCode) {
        countryCode = getTier1Country(asn);
      }

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

/**
 * Check if an ASN is a known Tier-1 provider
 */
function isTier1AS(asn) {
  // Major Tier-1 transit providers
  const tier1ASNs = [
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
  return tier1ASNs.includes(Number(asn));
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
    getBGPPaths(ipInfo.prefix),
  ]);

  // Use geolocation country code if AS overview doesn't have it
  const countryCode = asOverview.countryCode || geolocation?.countryCode || null;

  // Merge path analysis into upstreams
  const upstreamsWithPathInfo = neighbours.upstreams.map(u => ({
    ...u,
    isPrimary: pathAnalysis.upstreamInfo[u.asn]?.isPrimary || false,
    isBackup: pathAnalysis.upstreamInfo[u.asn]?.isBackup || false,
    hasPrepending: pathAnalysis.upstreamInfo[u.asn]?.hasPrepending || false,
    avgPathLength: pathAnalysis.upstreamInfo[u.asn]?.avgPathLength || null,
    rank: pathAnalysis.upstreamInfo[u.asn]?.rank || 999,
  }));

  // Sort upstreams by rank (primary first)
  upstreamsWithPathInfo.sort((a, b) => a.rank - b.rank);

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
    pathAnalysis, // Include full path analysis
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
  const backupUpstreams = bgpData.upstreams.filter(u =>
    !chainToShow.some(c => c.asn === u.asn) && u.asn !== bgpData.primaryAS.asn
  ).slice(0, 4);

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
  const PEER_X = CENTER_X - 500;   // Fixed X position for all peers
  const PEER_START_Y = 460;        // Start from Primary AS level
  const PEER_SPACING = 90;         // Vertical spacing between peers

  peers.forEach((peer, index) => {
    const nodeId = `peer-${peer.asn}`;

    nodes.push({
      id: nodeId,
      type: 'peerNode',
      position: {
        x: PEER_X,
        y: PEER_START_Y - (index * PEER_SPACING),
      },
      data: {
        asn: peer.asn,
        name: peer.name,
        countryCode: peer.countryCode || getKnownASCountry(peer.asn),
      },
    });

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


