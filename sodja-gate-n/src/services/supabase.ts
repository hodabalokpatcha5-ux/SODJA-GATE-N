import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://eubaqvmagzpibkdnssbw.supabase.co";
const supabaseKey = "sb_publishable_qQhNS2AtBsBjGalQIRiM5w_KCBYH-8x";

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Note: Pour utiliser les fonctionnalités Real-time, assurez-vous 
 * d'activer la réplication sur les tables concernées dans votre 
 * tableau de bord Supabase (Database > Replication).
 */
