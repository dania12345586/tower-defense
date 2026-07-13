import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://rrqtouhbhpzxpqfuldlv.supabase.co';
const supabaseKey = 'sb_publishable__0FWveft58VYiS35xKbxxw_EXAlrLwX';

export const supabase = createClient(supabaseUrl, supabaseKey);