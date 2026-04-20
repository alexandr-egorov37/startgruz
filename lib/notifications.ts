import { supabase } from './supabase';

/**
 * МАППИНГ УСЛУГ (RU -> KEY)
 */
const SERVICE_MAP: Record<string, string> = {
    "Грузчики": "loaders",
    "Газель": "gazelle",
    "Разнорабочие": "loaders", 
    "Такелажные работы": "rigging",
    "Такелаж": "rigging",
    "Переезд": "loaders", 
    "Сборка мебели": "furniture"
};

/**
 * ГАРАНТИРОВАННЫЙ ДИСПЕТЧЕР (ПОИСК КАНДИДАТОВ)
 */
export async function findCandidates(order: any) {
    try {
        const orderCity = order.city || 'Шуя';
        const orderType = order.type || 'Переезд';
        
        console.log(">>> [FINDING] Looking for experts for:", orderType, "in", orderCity);
        
        const serviceKey = SERVICE_MAP[orderType as keyof typeof SERVICE_MAP] || "loaders";

        // 1. Get online executors from presence (single source of truth)
        // Widened window to 120s to ensure stability against heartbeats
        const twoMinsAgo = new Date(Date.now() - 120 * 1000).toISOString();
        const { data: onlinePresence } = await supabase.from('presence')
            .select('user_id')
            .eq('status', 'online')
            .gt('updated_at', twoMinsAgo);
        const onlineIds = new Set((onlinePresence || []).map(p => p.user_id));

        // 2. Fetch executors in city
        let { data: allExecutors, error: fetchError } = await supabase
          .from('executors')
          .select('id, name, avatar, city, rating, services, verification_status')
          .eq('city', orderCity);

        if (fetchError && fetchError.message.includes('column executors.services does not exist')) {
            const fallback = await supabase
                .from('executors')
                .select('id, name, avatar, city, rating, verification_status')
                .eq('city', orderCity);
            allExecutors = fallback.data as any[];
        }

        // Fetch real ratings separately from executor_rating view
        const allIds = (allExecutors || []).map(ex => ex.id);
        const { data: ratingsData } = allIds.length > 0
          ? await supabase.from('executor_rating').select('executor_id, rating, reviews_count').in('executor_id', allIds)
          : { data: [] };
        const ratingsMap = new Map<string, any>();
        (ratingsData || []).forEach(r => ratingsMap.set(r.executor_id, r));

        const processedExecutors = (allExecutors || []).map(ex => ({
            ...ex,
            real_rating: ratingsMap.get(ex.id)?.rating ?? null,
            reviews_count: ratingsMap.get(ex.id)?.reviews_count ?? 0,
        }));

        // 3. SMART FILTER LOGIC
        const candidates = processedExecutors.filter(ex => {
            // A. Service Match (MANDATORY)
            let hasService = false;
            if (!ex.services) {
                hasService = true; // Fallback if meta is missing
            } else if (Array.isArray(ex.services)) {
                hasService = ex.services.includes(serviceKey);
            } else if (typeof ex.services === 'object') {
                hasService = (ex.services as any)[serviceKey] === true;
            }
            if (!hasService) return false;

            // B. Gazelle Logic (STRICT IF REQUIRED)
            // If order explicitly needs a vehicle, filter out those who don't have it.
            const orderNeedsTruck = order.details?.vehicleType === 'Газель' || order.type === 'Газель';
            if (orderNeedsTruck) {
                let hasTruck = false;
                if (Array.isArray(ex.services)) {
                    hasTruck = ex.services.includes('gazelle');
                } else if (typeof ex.services === 'object') {
                    hasTruck = (ex.services as any)['gazelle'] === true;
                }
                if (!hasTruck) return false;
            }

            return true; // City match is handled in the DB query
        });

        // 4. SCORING & RANKING (Smart Matching)
        // Instead of cutting people out with hard filters, we rank the best ones to the top.
        candidates.sort((a, b) => {
            let scoreA = 0;
            let scoreB = 0;

            // Online gives a massive boost for immediate response
            if (onlineIds.has(a.id)) scoreA += 20;
            if (onlineIds.has(b.id)) scoreB += 20;

            // Rating boost
            scoreA += (a.real_rating || 0) * 5;
            scoreB += (b.real_rating || 0) * 5;

            // Verification boost
            if (a.verification_status === 'verified') scoreA += 10;
            if (b.verification_status === 'verified') scoreB += 10;

            // Experience boost
            scoreA += Math.min(a.reviews_count || 0, 100) / 2;
            scoreB += Math.min(b.reviews_count || 0, 100) / 2;

            return scoreB - scoreA;
        });

        // 4. Fetch additional info (Portfolio)
        const ids = candidates.map(c => c.id);
        const { data: portfolios } = ids.length > 0 ? await supabase
            .from('executor_portfolio')
            .select('id, executor_id, title, description, photo_url, is_visible, created_at')
            .in('executor_id', ids)
            .eq('is_visible', true) : { data: [] };

        const maskPhone = (t: string) => t.replace(/\+?\d[\d\s\-()]{8,}/g, "[СКРЫТО]");

        const finalQueue = candidates.map(c => ({
            ...c,
            portfolio: (portfolios || [])
                .filter(p => p.executor_id === c.id)
                .map(p => ({ ...p, description: maskPhone(p.description || '') }))
        }));

        console.log("CANDIDATES MATCHED:", finalQueue.length);
        return finalQueue;

    } catch (e: any) {
        console.error("FATAL in findCandidates:", e.message);
        return [];
    }
}

/**
 * FALLBACK DISPATCHER
 * If strict filters return zero, we expand search parameters
 */
export async function findCandidatesWithFallback(order: any) {
    try {
        console.log(">>> [FALLBACK] Expanding search parameters...");
        const candidates = await findCandidates(order);
        if (candidates.length > 0) return candidates;

        // If still 0, try to find ANY service matched expert in the city regardless of vehicle/online
        const orderCity = order.city || 'Шуя';
        const orderType = order.type || 'Переезд';
        const serviceKey = SERVICE_MAP[orderType as keyof typeof SERVICE_MAP] || "loaders";

        const { data: allCityExecs } = await supabase.from('executors').select('*').eq('city', orderCity);
        const basicMatch = (allCityExecs || []).filter(ex => {
            if (!ex.services) return true;
            let hasService = false;
            if (Array.isArray(ex.services)) {
                hasService = ex.services.includes(serviceKey);
            } else if (typeof ex.services === 'object') {
                hasService = (ex.services as any)[serviceKey] === true;
            }
            return hasService;
        });

        basicMatch.sort((a,b) => (b.rating || 0) - (a.rating || 0));
        return basicMatch.slice(0, 5).map(c => ({
            ...c,
            portfolio: [] // Minimal data for fallback
        }));
    } catch (e) {
        return [];
    }
}

export async function notifyExecutor(orderId: string, executorId: string) {
    console.log(`[REAL DISPATCH] Target Master ID: ${executorId}`);
    const { data, error } = await supabase
        .from('executor_orders')
        .insert({
            order_id: orderId,
            executor_id: executorId,
            status: 'new'
        })
        .select();
    
    if (error) {
        console.error(`EXECUTOR_ID: ${executorId} | ORDER_ID: ${orderId} | RESULT: FAIL`);
        console.error(`=> REASON: ${error.message} (Code: ${error.code}, Details: ${error.details})`);
    } else {
        console.log(`EXECUTOR_ID: ${executorId} | ORDER_ID: ${orderId} | RESULT: SUCCESS`);
    }
}

export async function notifyExecutors(order: any) {
    const list = await findCandidates(order);
    if (list.length > 0) {
        await notifyExecutor(order.id, list[0].id);
        return { success: true, candidates: list };
    }
    return { success: false, candidates: [] };
}

