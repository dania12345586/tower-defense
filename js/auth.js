import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://rrqtouhbhpzxpqfuldlv.supabase.co';
const supabaseKey = 'sb_publishable__0FWveft58VYiS35xKbxxw_EXAlrLwX';
const supabase = createClient(supabaseUrl, supabaseKey);

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'tower-defense-salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function register(username, password) {
    console.log('Попытка регистрации:', username);
    const { data: existing, error: checkError } = await supabase
        .from('players')
        .select('id')
        .eq('username', username)
        .maybeSingle();
    if (checkError) {
        console.error('Ошибка проверки существования пользователя:', checkError);
        throw new Error('Ошибка проверки: ' + checkError.message);
    }
    if (existing) {
        console.warn('Пользователь уже существует:', username);
        throw new Error('Имя пользователя уже занято');
    }

    const passwordHash = await hashPassword(password);
    console.log('Хэш пароля:', passwordHash);

    // ===== ИЗМЕНЕНИЕ: убираем electric из начального списка =====
    const defaultTowers = ['pistol', 'flame', 'dj'];

    const { data, error } = await supabase
        .from('players')
        .insert([{
            username: username,
            password_hash: passwordHash,
            gold: 150,
            coins: 0,
            unlocked_towers: defaultTowers,
            completed_waves: 0,
            achievements: []
        }])
        .select()
        .single();

    if (error) {
        console.error('Ошибка вставки в таблицу:', error);
        throw new Error('Ошибка регистрации: ' + error.message);
    }
    console.log('Пользователь успешно создан:', data);
    return data;
}

export async function login(username, password) {
    console.log('Попытка входа:', username);
    const passwordHash = await hashPassword(password);
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('username', username)
        .eq('password_hash', passwordHash)
        .maybeSingle();
    if (error) {
        console.error('Ошибка входа:', error);
        throw new Error('Ошибка входа: ' + error.message);
    }
    if (!data) {
        console.warn('Неверные учётные данные:', username);
        throw new Error('Неверное имя пользователя или пароль');
    }
    console.log('Успешный вход:', data);
    return data;
}

export async function loadProgress(userId) {
    const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', userId)
        .single();
    if (error) throw new Error(error.message);
    return data;
}

export async function saveProgress(userId, updates) {
    const { error } = await supabase
        .from('players')
        .update(updates)
        .eq('id', userId);
    if (error) throw new Error(error.message);
    return true;
}

export function getCurrentUser() {
    const data = localStorage.getItem('user');
    if (!data) return null;
    try {
        const user = JSON.parse(data);
        if (user && user.id) return user;
        return null;
    } catch (e) {
        return null;
    }
}

export function setCurrentUser(user) {
    if (!user || !user.id) return;
    localStorage.setItem('user', JSON.stringify(user));
}

export function clearCurrentUser() {
    localStorage.removeItem('user');
}